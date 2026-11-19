/**
 * SPEC-FISC-003 acceptance #3: drive the real stack (outbox, worker, adapter, ledger)
 * against Plemsi's SANDBOX with a throwaway MySQL, and print a REDACTED summary.
 *
 *   docker run -d --name pos-sandbox-db -e MYSQL_ROOT_PASSWORD=locktest -e MYSQL_DATABASE=pos_lock_test -p 3319:3306 mysql:8.0
 *   npx ts-node --transpile-only scripts/fiscal-sandbox-run.ts <env-file> [--check] [--skip-pos]
 *
 * The env file (chmod 600, outside the repo) holds the credentials; this script never
 * prints or logs them and everything it prints passes through `redact`. It writes
 * nothing to the repo. `--check` only validates the file; it makes no network call.
 *
 * Variables: PLEMSI_SANDBOX_TOKEN, ISSUER_NIT (with DV, e.g. 900123456-8), ISSUER_LEGAL_NAME,
 * POS_PREFIX, POS_RESOLUTION, INVOICE_PREFIX, INVOICE_RESOLUTION, CREDIT_NOTE_PREFIX,
 * CREDIT_NOTE_RESOLUTION; optional PLEMSI_SANDBOX_BASE_URL (https only).
 * `--skip-pos` runs only the invoice and the credit note that reverses it.
 */
process.env.NODE_ENV = 'test'; // the worker is driven by hand below, not by its timer
import 'reflect-metadata';
import { randomBytes, randomUUID } from 'crypto';
import { readFileSync, statSync } from 'fs';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { DocumentsService } from '../src/modules/fiscal/documents/documents.service';
import { PLEMSI_BASE_URL } from '../src/modules/fiscal/emission/plemsi/plemsi.constants';
import { PlemsiConfigService } from '../src/modules/fiscal/emission/plemsi/plemsi-config.service';
import { FiscalModule } from '../src/modules/fiscal/fiscal.module';
import { FiscalProfile } from '../src/modules/fiscal/fiscal-profile/entities/fiscal-profile.entity';
import { splitNit } from '../src/modules/fiscal/fiscal-profile/nit';
import { LedgerSale } from '../src/modules/fiscal/ledger/ledger-sale.entity';
import { FiscalEmissionService } from '../src/modules/fiscal/outbox/fiscal-emission.service';
import { EmissionOutbox } from '../src/modules/fiscal/outbox/outbox.entity';
import { OutboxWorker } from '../src/modules/fiscal/outbox/outbox.worker';

const REQUIRED = ['PLEMSI_SANDBOX_TOKEN', 'ISSUER_NIT', 'ISSUER_LEGAL_NAME', 'POS_PREFIX', 'POS_RESOLUTION', 'INVOICE_PREFIX', 'INVOICE_RESOLUTION', 'CREDIT_NOTE_PREFIX', 'CREDIT_NOTE_RESOLUTION'] as const;
type Key = (typeof REQUIRED)[number] | 'PLEMSI_SANDBOX_BASE_URL';

function loadEnv(path: string): Record<Key, string | undefined> {
  if ((statSync(path).mode & 0o077) !== 0) throw new Error(`${path} must be chmod 600 (it holds a credential)`);
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out as Record<Key, string | undefined>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const secrets: string[] = [];
const redact = (s: unknown) => secrets.reduce((acc, x) => (x ? acc.split(x).join('<redacted>') : acc), String(s ?? ''));
const t0 = Date.now();
const log = (m: string) => console.log(`[+${String(Math.round((Date.now() - t0) / 1000)).padStart(3)}s] ${redact(m)}`);
const mask = (c: string | null) => (c ? `${c.slice(0, 8)}…(${c.length})` : 'none');

/**
 * Diagnostics: show what the provider answered, without ever showing a document body
 * or personal data. POST answers are printed by their message/error fields only;
 * status lookups only by state, numbering and DIAN's rule texts. Everything is redacted.
 */
const SENSITIVE = /nit|identif|name|email|address|phone|qr|token|xml|zip|base64|pdf|note|customer|buyer/i;
function pick(v: unknown, depth = 0): unknown {
  if (v && typeof v === 'object' && depth < 6) {
    return Array.isArray(v) ? v.slice(0, 20).map((x) => pick(x, depth + 1)) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SENSITIVE.test(k) ? '<omitted>' : pick(x, depth + 1)]));
  }
  return typeof v === 'string' ? redact(v).slice(0, 300) : v;
}
function installDiagnostics() {
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await real(input, init);
    const path = new URL(String(input)).pathname;
    const raw = await res.clone().text();
    let body: Record<string, any> | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    try { body = JSON.parse(raw); } catch { /* non-JSON */ }
    if ((init?.method ?? 'GET') === 'POST') {
      log(`HTTP ${res.status} POST ${path} -> ${body ? JSON.stringify(pick({ code: body.code, success: body.success, info: body.info, errCode: body.errCode, message: body.data?.message, errors: body.data?.errors, dian: body.data?.response })) : `non-JSON, ${raw.length} chars`}`);
    } else if (path.endsWith('/one') && body?.data) {
      const d = body.data;
      log(`HTTP ${res.status} GET ${path.replace(/^\/api\//, '')} -> ${JSON.stringify(pick({ state: d.state, prefix: d.prefix, number: d.number, resolution_number: d.resolution_number, dian: d.response }))}`);
    }
    return res;
  }) as typeof fetch;
}

const line19 = { code: 'SANDBOX-1', description: 'Producto de prueba', quantity: 1, unit_price: 10000, iva_rate: 19, subtotal: 10000, iva_amount: 1900, total: 11900 };

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  const flag = flags.includes('--check') ? '--check' : undefined;
  const skipPos = flags.includes('--skip-pos');
  if (!file) throw new Error('usage: fiscal-sandbox-run.ts <env-file> [--check]');
  const env = loadEnv(file);
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) throw new Error(`missing in env file: ${missing.join(', ')}`);
  const nit = splitNit(env.ISSUER_NIT!);
  if (!nit) throw new Error('ISSUER_NIT must look like 900123456-8');
  secrets.push(env.PLEMSI_SANDBOX_TOKEN!, env.ISSUER_NIT!, nit.base, env.ISSUER_LEGAL_NAME!);
  if (env.PLEMSI_SANDBOX_BASE_URL) {
    if (!env.PLEMSI_SANDBOX_BASE_URL.startsWith('https://')) throw new Error('PLEMSI_SANDBOX_BASE_URL must be https');
    (PLEMSI_BASE_URL as { sandbox: string }).sandbox = env.PLEMSI_SANDBOX_BASE_URL.replace(/\/$/, '');
  }
  log(`env file ok (${REQUIRED.length} variables present); sandbox host: ${new URL(PLEMSI_BASE_URL.sandbox).host}`);
  if (flag === '--check') return log('--check: no network call made');

  installDiagnostics();
  process.env.FISCAL_KEK = randomBytes(32).toString('base64'); // throwaway, dies with the process
  @Module({
    imports: [
      LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
      TypeOrmModule.forRoot({
        ...(dataSourceOptions as object), host: '127.0.0.1', port: 3319, username: 'root', password: 'locktest', database: 'pos_lock_test',
        synchronize: false, dropSchema: true, migrationsRun: true,
      } as never),
      FiscalModule,
    ],
  })
  class Root {}
  const app = await NestFactory.createApplicationContext(Root, { logger: false });
  const ds = app.get(DataSource);
  const company = randomUUID();
  const configs = app.get(PlemsiConfigService);
  const worker = app.get(OutboxWorker);

  await ds.manager.insert(FiscalProfile, { company_id: company, nit: nit.base, dv: nit.dv, legal_name: env.ISSUER_LEGAL_NAME!, responsibility_codes: [] });
  await configs.set(company, 'sandbox', env.PLEMSI_SANDBOX_TOKEN!);
  await configs.configureEmission(company, {
    enabled: true, pos_prefix: env.POS_PREFIX, pos_resolution: env.POS_RESOLUTION, invoice_prefix: env.INVOICE_PREFIX,
    invoice_resolution: env.INVOICE_RESOLUTION, credit_note_prefix: env.CREDIT_NOTE_PREFIX, credit_note_resolution: env.CREDIT_NOTE_RESOLUTION,
  });
  const adapter = await configs.adapterFor(company);
  const summary: Record<string, unknown> = {};

  // Probes that need no document: remaining numbering and the 404 behaviour.
  for (const [label, resolution, prefix] of [['pos', env.POS_RESOLUTION!, env.POS_PREFIX!], ['invoice', env.INVOICE_RESOLUTION!, env.INVOICE_PREFIX!], ['credit_note', env.CREDIT_NOTE_RESOLUTION!, env.CREDIT_NOTE_PREFIX!]] as const) {
    try { summary[`nextNumber.${label}`] = await adapter.nextNumber(resolution, prefix); } catch (e) { summary[`nextNumber.${label}`] = `ERROR ${(e as Error).message}`; }
  }
  try { summary['getStatus.unknownDocument'] = (await adapter.getStatus('pos', env.POS_PREFIX!, 987654321)) ?? 'null (404)'; } catch (e) { summary['getStatus.unknownDocument'] = `ERROR ${(e as Error).message}`; }
  log(`probes: ${JSON.stringify(summary)}`);

  async function drive(label: string, id: string, maxSeconds = 300): Promise<EmissionOutbox> {
    let last = '';
    for (const start = Date.now(); Date.now() - start < maxSeconds * 1000; ) {
      await worker.tick(new Date(Date.now() + 3600_000)); // skip backoff waits; we sleep ourselves
      const r = await ds.manager.findOneByOrFail(EmissionOutbox, { id });
      const now = `${r.status} attempts=${r.attempts} number=${r.prefix ?? ''}${r.number ?? ''}`;
      if (now !== last) log(`${label}: ${now}${r.last_error ? ` error="${r.last_error.slice(0, 300)}"` : ''}`);
      last = now;
      if (['validated', 'rejected', 'failed'].includes(r.status)) return r;
      await sleep(8000);
    }
    log(`${label}: still not terminal after ${maxSeconds}s`);
    return ds.manager.findOneByOrFail(EmissionOutbox, { id });
  }

  // 1. POS, queued exactly as a closed sale queues it.
  let posOk = skipPos;
  if (skipPos) log('pos: skipped (--skip-pos)');
  else {
    const facade = app.get(FiscalEmissionService);
    const orderId = randomUUID();
    await ds.transaction((m) => facade.enqueuePos(m, { companyId: company, orderId, draft: { lines: [{ code: 'SANDBOX-1', description: 'Producto de prueba', quantity: 1, unitPrice: 10000, ivaRate: 19, subtotal: 10000, ivaAmount: 1900, total: 11900 }], headNote: 'Prueba sandbox' } }));
    const pos = await drive('pos', (await ds.manager.findOneByOrFail(EmissionOutbox, { order_id: orderId })).id);
    summary.pos = { status: pos.status, cufe: mask(pos.cufe), qr: pos.qr ? 'present' : 'none', error: pos.last_error };
    summary['nextNumber.pos.afterEmit'] = await adapter.nextNumber(env.POS_RESOLUTION!, env.POS_PREFIX!).catch((e: Error) => `ERROR ${e.message}`);
    if (pos.status === 'validated' && pos.cufe) {
      try { const pdf = await adapter.getPdf(pos.cufe); summary['pdf.pos'] = `ok, ${pdf.base64.length} base64 chars, filename present=${!!pdf.filename}`; } catch (e) { summary['pdf.pos'] = `ERROR ${(e as Error).message}`; }
    }
    posOk = pos.status === 'validated';
  }

  if (!posOk) { log('POS not validated: stopping here (invoice and credit note only follow an accepted POS unless --skip-pos).'); } else {
    // 2. Invoice (final consumer) through the documents API service.
    const docs = app.get(DocumentsService);
    const inv = await docs.create(company, { type: 'invoice', lines: [line19] } as never);
    const invRow = await drive('invoice', inv.id);
    summary.invoice = { status: invRow.status, number: `${invRow.prefix}${invRow.number}`, cufe: mask(invRow.cufe), error: invRow.last_error };
    if (invRow.status === 'validated' && invRow.cufe) {
      try { const pdf = await adapter.getPdf(invRow.cufe); summary['pdf.invoice'] = `ok, ${pdf.base64.length} base64 chars, filename present=${!!pdf.filename}`; } catch (e) { summary['pdf.invoice'] = `ERROR ${(e as Error).message}`; }
      const led = await ds.manager.findOneByOrFail(LedgerSale, { outbox_id: invRow.id });
      summary.ledgerAfterInvoice = { type: led.document_type, base: led.base_total, tax: led.tax_total, total: led.total, date: led.issue_date };
      // 3. Credit note reversing it.
      const cn = await docs.create(company, {
        type: 'credit_note', lines: [line19], reference: { number: `${invRow.prefix}${invRow.number}`, cufe: invRow.cufe, issue_date: led.issue_date },
        discrepancy_code: 2, discrepancy_description: 'Anulación solicitada por el emisor',
      } as never);
      const cnRow = await drive('credit_note', cn.id);
      summary.credit_note = { status: cnRow.status, number: `${cnRow.prefix}${cnRow.number}`, cufe: mask(cnRow.cufe), error: cnRow.last_error };
    }
  }
  const book = await app.get(DataSource).manager.find(LedgerSale, { where: { company_id: company }, order: { issued_at: 'ASC' } });
  summary.ledgerFinal = book.map((l) => ({ type: l.document_type, sign: l.sign, total: l.total }));
  log(`SUMMARY ${JSON.stringify(summary, null, 2)}`);
  await app.close();
}

main().then(() => process.exit(0), (e) => { console.error(`FAILED: ${redact((e as Error).message)}`); process.exit(1); });
