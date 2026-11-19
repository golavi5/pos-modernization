/**
 * SPEC-FISC-003 T-09 over HTTP against a real MySQL 8: validated documents land in
 * the sales book in the same transaction that validates them. Scripted provider, no
 * network. Same throwaway DB as the other e2e specs (port 3319).
 */
import 'reflect-metadata';
import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { ApiKeysService } from '../src/modules/fiscal/access/api-keys.service';
import { PlemsiConfig } from '../src/modules/fiscal/emission/plemsi/plemsi-config.entity';
import { PlemsiConfigService } from '../src/modules/fiscal/emission/plemsi/plemsi-config.service';
import { FiscalModule } from '../src/modules/fiscal/fiscal.module';
import { FiscalProfile } from '../src/modules/fiscal/fiscal-profile/entities/fiscal-profile.entity';
import { LedgerSale } from '../src/modules/fiscal/ledger/ledger-sale.entity';
import { SalesLedgerService } from '../src/modules/fiscal/ledger/sales-ledger.service';
import { EmissionOutbox } from '../src/modules/fiscal/outbox/outbox.entity';
import { OutboxWorker } from '../src/modules/fiscal/outbox/outbox.worker';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const asUser = (company_id: string, roles: string[]) => ({ company_id, roles, hasAnyRole: (r: string[]) => r.some((x) => roles.includes(x)) });
const line = (subtotal: number, rate: number) => ({ code: 'A', description: 'A', quantity: 1, unitPrice: subtotal, ivaRate: rate, subtotal, ivaAmount: (subtotal * rate) / 100, total: subtotal + (subtotal * rate) / 100 });
const buyer = { identificationNumber: '900123456', dv: '8', name: 'ACME SAS', typeDocumentIdentificationId: 6, typeOrganizationId: 1, typeLiabilityId: 117, municipalityId: 350, typeRegimeId: 2 };

describe('sales ledger (e2e, real MySQL)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let worker: OutboxWorker;
  let user = asUser(A, ['admin']);
  let n = 0;
  const provider = { emit: jest.fn(), getStatus: jest.fn(), nextNumber: jest.fn(), getPdf: jest.fn() };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
        TypeOrmModule.forRoot({
          ...(dataSourceOptions as object),
          host: '127.0.0.1', port: 3319, username: 'root', password: 'locktest', database: 'pos_lock_test',
          synchronize: false, dropSchema: true, migrationsRun: true,
        } as never),
        FiscalModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (ctx: ExecutionContext) => ((ctx.switchToHttp().getRequest().user = user), true) })
      .compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    worker = app.get(OutboxWorker);
    jest.spyOn(app.get(PlemsiConfigService), 'adapterFor').mockResolvedValue(provider as unknown as never);
    for (const company_id of [A, B]) {
      await ds.manager.insert(PlemsiConfig, { company_id, environment: 'sandbox', wrapped_data_key: 'x', token_encrypted: 'x', emission_enabled: true, pos_prefix: 'POS', pos_resolution: '1', invoice_prefix: 'FV', invoice_resolution: '9', credit_note_prefix: 'NC', credit_note_resolution: '8' });
      await ds.manager.insert(FiscalProfile, { company_id, nit: '800197268', dv: '4', legal_name: 'Empresa SAS', responsibility_codes: [] });
    }
  });

  afterAll(async () => app?.close());
  beforeEach(async () => {
    Object.values(provider).forEach((f) => f.mockReset());
    provider.nextNumber.mockImplementation(async () => 100 + ++n);
    await ds.query('DELETE FROM fiscal_ledger_sales');
    await ds.query('DELETE FROM fiscal_emission_outbox');
  });

  /** Queues a document and lets the worker validate it at `issuedAt`. */
  async function validate(company: string, type: 'pos' | 'invoice' | 'credit_note', lines: object[], issuedAt: string, verdict: 'accepted' | 'pending' | 'rejected' = 'accepted') {
    const draft = type === 'pos' ? { lines } : { lines, buyer: type === 'invoice' ? buyer : null, sendEmail: false, ...(type === 'credit_note' && { reference: { number: 'FV1', cufe: 'c', issueDate: '2026-11-01' }, discrepancyCode: 2, discrepancyDescription: 'x' }) };
    const { identifiers } = await ds.manager.insert(EmissionOutbox, { company_id: company, order_id: null, document_type: type, status: 'pending', draft: draft as never, next_attempt_at: new Date(Date.now() - 1000) });
    provider.emit.mockResolvedValueOnce({ outcome: 'submitted', cude: `cufe-${identifiers[0].id}`, qr: null, verdict, reason: null, issuedAt: new Date(issuedAt) });
    await worker.tick();
    return identifiers[0].id as string;
  }

  const staff = (qs = '') => request(app.getHttpServer()).get(`/fiscal/v1/admin/ledger/sales${qs}`);

  it('records a validated document with its own figures, once, and dates it in Colombia time', async () => {
    const id = await validate(A, 'pos', [line(2000, 19), line(1000, 5), line(500, 0)], '2026-11-19T03:30:00Z');
    const r = await staff().expect(200);
    expect(r.body.disclaimer).toContain('revisión del contador');
    expect(r.body.totals).toEqual({ documents: 1, base_total: 3500, tax_total: 430, total: 3930 });
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0]).toMatchObject({ document_type: 'pos', prefix: 'POS', cufe: `cufe-${id}`, issue_date: '2026-11-18', base_total: 3500, tax_total: 430, total: 3930, sign: 1, buyer_identification: null });
    expect(r.body.data[0].tax_breakdown).toEqual(expect.arrayContaining([expect.objectContaining({ tax_id: 1, percent: 19, tax_amount: 380, taxable_amount: 2000 })]));
    expect(JSON.stringify(r.body)).not.toContain('outbox_id');

    const row = await ds.manager.findOneByOrFail(EmissionOutbox, { id });
    await ds.transaction((m) => app.get(SalesLedgerService).record(m, row)); // recording again is a no-op
    expect(await ds.manager.count(LedgerSale)).toBe(1);
  });

  it('only validated documents are in the book', async () => {
    await validate(A, 'pos', [line(100, 0)], '2026-11-19T15:00:00Z', 'pending');
    await validate(A, 'pos', [line(100, 0)], '2026-11-19T15:00:00Z', 'rejected');
    expect((await staff().expect(200)).body.totals.documents).toBe(0);
    provider.getStatus.mockResolvedValue({ verdict: 'accepted', cude: 'c', qr: null, preview: null, reason: null });
    await ds.query("UPDATE fiscal_emission_outbox SET next_attempt_at = NOW() - INTERVAL 1 HOUR WHERE status = 'sent'");
    await worker.tick();
    expect((await staff().expect(200)).body.totals.documents).toBe(1);
  });

  it('credit notes count negative in the totals; invoices carry the buyer', async () => {
    await validate(A, 'invoice', [line(1000, 19)], '2026-11-02T15:00:00Z');
    await validate(A, 'credit_note', [line(400, 19)], '2026-11-03T15:00:00Z');
    const r = await staff().expect(200);
    expect(r.body.totals).toEqual({ documents: 2, base_total: 600, tax_total: 114, total: 714 });
    expect(r.body.data.map((d: { document_type: string; sign: number }) => [d.document_type, d.sign])).toEqual([['invoice', 1], ['credit_note', -1]]);
    expect(r.body.data[0]).toMatchObject({ buyer_identification: '900123456', buyer_name: 'ACME SAS' });
  });

  it('filters by date range (Colombia calendar days, inclusive) and by type; totals follow the filter', async () => {
    await validate(A, 'pos', [line(100, 0)], '2026-11-01T15:00:00Z');
    await validate(A, 'pos', [line(200, 0)], '2026-11-10T15:00:00Z');
    await validate(A, 'invoice', [line(400, 0)], '2026-11-10T16:00:00Z');
    await validate(A, 'pos', [line(800, 0)], '2026-11-30T15:00:00Z');
    const mid = await staff('?from=2026-11-10&to=2026-11-10').expect(200);
    expect(mid.body.totals).toMatchObject({ documents: 2, total: 600 });
    const pos = await staff('?from=2026-11-02&type=pos').expect(200);
    expect(pos.body.totals).toMatchObject({ documents: 2, total: 1000 });
    await staff('?from=11/10/2026').expect(400);
    await staff('?type=pos+').expect(400);
  });

  it('paginates by cursor in chronological order; totals cover every page', async () => {
    for (const [d, amount] of [['2026-11-03', 100], ['2026-11-01', 10], ['2026-11-02', 1]] as const) await validate(A, 'pos', [line(amount, 0)], `${d}T15:00:00Z`);
    const p1 = await staff('?limit=2').expect(200);
    expect(p1.body.data.map((d: { total: number }) => d.total)).toEqual([10, 1]);
    expect(p1.body.totals.total).toBe(111);
    expect(p1.body.next_cursor).toBeTruthy();
    const p2 = await staff(`?limit=2&cursor=${p1.body.next_cursor}`).expect(200);
    expect(p2.body.data.map((d: { total: number }) => d.total)).toEqual([100]);
    expect(p2.body.next_cursor).toBeNull();
    await staff('?cursor=garbage').expect(400);
  });

  it('is scoped to the company', async () => {
    await validate(B, 'pos', [line(999, 0)], '2026-11-19T15:00:00Z');
    expect((await staff().expect(200)).body.totals.documents).toBe(0);
  });

  it('staff access: admin, manager and accountant; not a cashier', async () => {
    for (const role of ['manager', 'accountant']) {
      user = asUser(A, [role]);
      await staff().expect(200);
    }
    user = asUser(A, ['cashier']);
    await staff().expect(403);
    user = asUser(A, ['admin']);
  });

  it('API access needs the ledger:read scope and sees only its issuer', async () => {
    await validate(A, 'pos', [line(100, 0)], '2026-11-19T15:00:00Z');
    const keys = app.get(ApiKeysService);
    const { key } = await keys.create(A, 'ledger', ['ledger:read']);
    const { key: noScope } = await keys.create(A, 'docs', ['documents:read']);
    const { key: other } = await keys.create(B, 'other', ['ledger:read']);
    const api = (k: string) => request(app.getHttpServer()).get('/fiscal/v1/ledger/sales').set('Authorization', `Bearer ${k}`);
    expect((await api(key).expect(200)).body.totals.documents).toBe(1);
    await api(noScope).expect(403);
    expect((await api(other).expect(200)).body.totals.documents).toBe(0);
    await request(app.getHttpServer()).get('/fiscal/v1/ledger/sales').expect(401);
  });

  it('validating and recording commit together: if the book write fails, the document is not left validated', async () => {
    const spy = jest.spyOn(app.get(SalesLedgerService), 'record').mockRejectedValueOnce(new Error('disk full'));
    const id = await validate(A, 'pos', [line(100, 0)], '2026-11-19T15:00:00Z');
    expect((await ds.manager.findOneByOrFail(EmissionOutbox, { id })).status).not.toBe('validated');
    expect(await ds.manager.count(LedgerSale)).toBe(0);
    spy.mockRestore();
    provider.getStatus.mockResolvedValue({ verdict: 'accepted', cude: 'c', qr: null, preview: null, reason: null });
    await ds.query('UPDATE fiscal_emission_outbox SET next_attempt_at = NOW() - INTERVAL 1 HOUR');
    await worker.tick();
    expect((await ds.manager.findOneByOrFail(EmissionOutbox, { id })).status).toBe('validated');
    expect(await ds.manager.count(LedgerSale)).toBe(1);
  });
});
