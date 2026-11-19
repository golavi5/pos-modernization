/**
 * SPEC-FISC-003 T-05 against a real MySQL 8: the outbox worker with a scripted
 * provider (no network). Same throwaway DB as the other e2e specs (port 3319).
 */
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { EmissionDocument, EmissionTransientError, PosDocument } from '../src/modules/fiscal/emission/emission.types';
import { PlemsiConfig } from '../src/modules/fiscal/emission/plemsi/plemsi-config.entity';
import { PlemsiConfigService } from '../src/modules/fiscal/emission/plemsi/plemsi-config.service';
import { FiscalProfile } from '../src/modules/fiscal/fiscal-profile/entities/fiscal-profile.entity';
import { FiscalEmissionService } from '../src/modules/fiscal/outbox/fiscal-emission.service';
import { EmissionOutbox } from '../src/modules/fiscal/outbox/outbox.entity';
import { OutboxWorker, backoffMs } from '../src/modules/fiscal/outbox/outbox.worker';

const CO = '11111111-1111-4111-8111-111111111111';
const CO_NO_PROFILE = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-11-19T15:00:00Z');
const later = (ms: number) => new Date(NOW.getTime() + ms);
const draft = { lines: [{ code: 'A', description: 'Item', quantity: 1, unitPrice: 100, ivaRate: 0, subtotal: 100, ivaAmount: 0, total: 100 }] };
const accepted = { outcome: 'submitted' as const, cude: 'cude-1', qr: 'qr-1', verdict: 'accepted' as const, reason: null };

describe('outbox worker (e2e, real MySQL)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let worker: OutboxWorker;
  let facade: FiscalEmissionService;
  const provider = { emit: jest.fn(), getStatus: jest.fn(), nextNumber: jest.fn(), getPdf: jest.fn() };
  let n = 0;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
        TypeOrmModule.forRoot({
          ...(dataSourceOptions as object),
          host: '127.0.0.1', port: 3319, username: 'root', password: 'locktest', database: 'pos_lock_test',
          synchronize: false, dropSchema: true, migrationsRun: true,
        } as never),
        (await import('../src/modules/fiscal/fiscal.module')).FiscalModule,
      ],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    worker = app.get(OutboxWorker);
    facade = app.get(FiscalEmissionService);
    jest.spyOn(app.get(PlemsiConfigService), 'adapterFor').mockResolvedValue(provider as unknown as never);
    for (const company_id of [CO, CO_NO_PROFILE]) {
      await ds.manager.insert(PlemsiConfig, { company_id, environment: 'sandbox', wrapped_data_key: 'x', token_encrypted: 'x', emission_enabled: true, pos_prefix: 'POS', pos_resolution: '18760', invoice_prefix: 'FV', invoice_resolution: '99' });
    }
    await ds.manager.insert(FiscalProfile, { company_id: CO, nit: '800197268', dv: '4', legal_name: 'Empresa SAS', responsibility_codes: ['O-13'] });
  });

  afterAll(async () => app?.close());

  beforeEach(async () => {
    await ds.query('DELETE FROM fiscal_emission_outbox');
    await ds.query('DELETE FROM notifications');
    Object.values(provider).forEach((f) => f.mockReset());
    provider.nextNumber.mockResolvedValue(100);
  });

  async function seed(over: Partial<EmissionOutbox> = {}): Promise<EmissionOutbox> {
    const id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
    const res = await ds.manager.insert(EmissionOutbox, { company_id: CO, order_id: id, status: 'pending', draft, next_attempt_at: later(-1000), ...over });
    return ds.manager.findOneByOrFail(EmissionOutbox, { id: res.identifiers[0].id });
  }
  const reload = (r: EmissionOutbox) => ds.manager.findOneByOrFail(EmissionOutbox, { id: r.id });

  it('happy path: assigns the number, sends the document with profile data, stores CUFE and QR', async () => {
    const row = await seed();
    provider.emit.mockResolvedValue(accepted);
    await worker.tick(NOW);
    const sent = provider.emit.mock.calls[0][0] as PosDocument;
    expect(sent).toMatchObject({ type: 'pos', prefix: 'POS', number: 100, resolution: '18760', softwareManufacturer: { ownerName: 'Empresa SAS', companyName: 'Empresa SAS' } });
    expect(await reload(row)).toMatchObject({ status: 'validated', number: 100, prefix: 'POS', cufe: 'cude-1', qr: 'qr-1', last_error: null });
  });

  it('verdict not attached yet: row goes to sent and later ticks only poll, never re-emit', async () => {
    const row = await seed();
    provider.emit.mockResolvedValue({ ...accepted, verdict: 'pending' });
    await worker.tick(NOW);
    const sent = await reload(row);
    expect(sent.status).toBe('sent');
    expect(sent.next_attempt_at.getTime()).toBeGreaterThan(NOW.getTime());

    await worker.tick(later(1000)); // not due yet
    expect(provider.getStatus).not.toHaveBeenCalled();

    provider.getStatus.mockResolvedValue({ verdict: 'accepted', cude: 'cude-1', qr: 'qr-1', preview: null, reason: null });
    await worker.tick(later(backoffMs(1) + 1000));
    expect(provider.emit).toHaveBeenCalledTimes(1);
    expect(provider.getStatus).toHaveBeenCalledWith('pos', 'POS', 100);
    expect((await reload(row)).status).toBe('validated');
  });

  it('transient failure: sale untouched, row pending with backoff; the retry asks the provider first, then re-sends the SAME number', async () => {
    const row = await seed();
    provider.emit.mockRejectedValueOnce(new EmissionTransientError('Provider HTTP 503', 503));
    await worker.tick(NOW);
    const failed = await reload(row);
    expect(failed).toMatchObject({ status: 'pending', attempts: 1, number: 100, last_error: 'Provider HTTP 503' });
    expect(failed.next_attempt_at.getTime()).toBe(NOW.getTime() + backoffMs(1));

    provider.nextNumber.mockResolvedValue(555); // must not matter: the number is already stored
    provider.getStatus.mockResolvedValue(null);
    provider.emit.mockResolvedValue(accepted);
    await worker.tick(later(backoffMs(1) + 1));
    expect(provider.nextNumber).toHaveBeenCalledTimes(1);
    expect((provider.emit.mock.calls[1][0] as PosDocument).number).toBe(100);
    expect(await reload(row)).toMatchObject({ status: 'validated', number: 100 });
  });

  it('if the provider already has the document after a failed attempt, it is not emitted again', async () => {
    const row = await seed({ attempts: 1, number: 100, prefix: 'POS', resolution: '18760' });
    provider.getStatus.mockResolvedValue({ verdict: 'accepted', cude: 'c9', qr: 'q9', preview: null, reason: null });
    await worker.tick(NOW);
    expect(provider.emit).not.toHaveBeenCalled();
    expect(await reload(row)).toMatchObject({ status: 'validated', cufe: 'c9' });
  });

  it('payload rejection is permanent: rejected with its reason, no retry', async () => {
    const row = await seed();
    provider.emit.mockResolvedValue({ outcome: 'payload_rejected', reason: 'Dígito de verificación no corresponde' });
    await worker.tick(NOW);
    expect(await reload(row)).toMatchObject({ status: 'rejected', last_error: 'Dígito de verificación no corresponde' });
    await worker.tick(later(24 * 3600_000));
    expect(provider.emit).toHaveBeenCalledTimes(1);
  });

  it('DIAN rejection after submission is recorded as rejected', async () => {
    const row = await seed();
    provider.emit.mockResolvedValue({ outcome: 'submitted', cude: 'c', qr: null, verdict: 'rejected', reason: 'FAU06 | x' });
    await worker.tick(NOW);
    expect(await reload(row)).toMatchObject({ status: 'rejected', last_error: 'FAU06 | x', cufe: 'c' });
  });

  it('two rows in one tick get consecutive numbers even if the provider still reports the same next number', async () => {
    const a = await seed();
    const b = await seed();
    provider.emit.mockResolvedValue({ ...accepted, verdict: 'pending' });
    await worker.tick(NOW);
    expect([(await reload(a)).number, (await reload(b)).number]).toEqual([100, 101]);
  });

  it('gives up after the attempt cap: failed, not retried forever', async () => {
    const row = await seed({ attempts: 11, number: 100, prefix: 'POS', resolution: '18760' });
    provider.getStatus.mockResolvedValue(null);
    provider.emit.mockRejectedValue(new EmissionTransientError('Provider HTTP 502', 502));
    await worker.tick(NOW);
    expect(await reload(row)).toMatchObject({ status: 'failed' });
  });

  it('a sent row that never gets a verdict ends as failed with a provider hint, without re-emitting', async () => {
    const row = await seed({ status: 'sent', attempts: 11, number: 100, prefix: 'POS', resolution: '18760' });
    provider.getStatus.mockResolvedValue({ verdict: 'pending', cude: 'c', qr: null, preview: null, reason: null });
    await worker.tick(NOW);
    expect(provider.emit).not.toHaveBeenCalled();
    const r = await reload(row);
    expect(r.status).toBe('failed');
    expect(r.last_error).toContain('check the provider');
  });

  it('missing fiscal profile: failed with a reason, nothing sent', async () => {
    const row = await seed({ company_id: CO_NO_PROFILE });
    await worker.tick(NOW);
    expect(provider.emit).not.toHaveBeenCalled();
    expect(await reload(row)).toMatchObject({ status: 'failed' });
  });

  it('an unexpected error stores only its name, never its message (it could echo a payload)', async () => {
    const row = await seed();
    provider.emit.mockRejectedValue(new Error('secret payload NIT 800197268'));
    await worker.tick(NOW);
    const r = await reload(row);
    expect(r.last_error).toBe('Unexpected error (Error)');
    expect(r.attempts).toBe(1);
  });

  it('SKIP LOCKED: a row locked by another transaction is skipped, not waited on', async () => {
    const row = await seed();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    await qr.query('SELECT id FROM fiscal_emission_outbox WHERE id = ? FOR UPDATE', [row.id]);
    try {
      await worker.tick(NOW);
      expect(provider.emit).not.toHaveBeenCalled();
    } finally {
      await qr.rollbackTransaction();
      await qr.release();
    }
    provider.emit.mockResolvedValue(accepted);
    await worker.tick(NOW);
    expect((await reload(row)).status).toBe('validated');
  });

  it('a tick that starts while another is running is ignored (no double send)', async () => {
    const row = await seed();
    provider.emit.mockImplementation(async () => {
      await worker.tick(NOW); // re-entrancy guard
      return accepted;
    });
    await worker.tick(NOW);
    expect(provider.emit).toHaveBeenCalledTimes(1);
    expect((await reload(row)).status).toBe('validated');
  });

  it('invoices use the invoice numbering, are sent as invoices and their status is looked up on the invoice endpoint', async () => {
    const row = await seed({ order_id: null, document_type: 'invoice', draft: { ...draft, buyer: null, sendEmail: false } as never });
    provider.nextNumber.mockResolvedValue(41);
    provider.emit.mockResolvedValue({ ...accepted, verdict: 'pending' });
    await worker.tick(NOW);
    const sent = provider.emit.mock.calls[0][0] as EmissionDocument;
    expect(sent).toMatchObject({ type: 'invoice', prefix: 'FV', number: 41, resolution: '99' });
    expect((sent as unknown as Record<string, unknown>).softwareManufacturer).toBeUndefined();
    expect(provider.nextNumber).toHaveBeenCalledWith('99', 'FV');
    provider.getStatus.mockResolvedValue({ verdict: 'accepted', cude: 'c', qr: null, preview: null, reason: null });
    await worker.tick(later(backoffMs(1) + 1000));
    expect(provider.getStatus).toHaveBeenCalledWith('invoice', 'FV', 41);
    expect((await reload(row)).status).toBe('validated');
  });

  it('a document type with no numbering configured fails with a reason instead of being sent', async () => {
    const row = await seed({ order_id: null, document_type: 'credit_note', draft: draft as never });
    await worker.tick(NOW);
    expect(provider.emit).not.toHaveBeenCalled();
    expect(await reload(row)).toMatchObject({ status: 'failed' });
  });

  it('notifies the company when a document ends rejected or failed, and not when it validates', async () => {
    const ok = await seed();
    provider.emit.mockResolvedValueOnce(accepted);
    await worker.tick(NOW);
    expect(await ds.query('SELECT COUNT(*) c FROM notifications')).toEqual([{ c: '0' }]);

    const bad = await seed();
    provider.emit.mockResolvedValueOnce({ outcome: 'payload_rejected', reason: 'Municipio inexistente' });
    await worker.tick(NOW);
    const failed = await seed({ company_id: CO_NO_PROFILE });
    await worker.tick(NOW);
    const rows = await ds.query('SELECT companyId, priority, title, message, data FROM notifications ORDER BY id');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ companyId: CO, priority: 'high', title: 'Documento electrónico rechazado', message: 'Municipio inexistente' });
    expect(JSON.parse(JSON.stringify(rows[0].data))).toMatchObject({ fiscalOutboxId: bad.id, status: 'rejected' });
    expect(rows[1]).toMatchObject({ companyId: CO_NO_PROFILE, title: 'Documento electrónico sin enviar' });
    expect([ok.id, failed.id]).not.toContain(bad.id);
  });

  it('facade: one row per order, ignores a repeat, records an unmappable sale as failed', async () => {
    const orderId = '99999999-9999-4999-8999-999999999999';
    expect(await ds.transaction((m) => facade.isEnabled(m, CO))).toBe(true);
    expect(await ds.transaction((m) => facade.isEnabled(m, '33333333-3333-4333-8333-333333333333'))).toBe(false);
    await ds.transaction((m) => facade.enqueuePos(m, { companyId: CO, orderId, draft }));
    await ds.transaction((m) => facade.enqueuePos(m, { companyId: CO, orderId, draft }));
    expect(await ds.manager.count(EmissionOutbox, { where: { order_id: orderId } })).toBe(1);
    const other = '88888888-8888-4888-8888-888888888888';
    await ds.transaction((m) => facade.enqueuePos(m, { companyId: CO, orderId: other, draft: null, unsupportedReason: 'nope' }));
    expect(await ds.manager.findOneByOrFail(EmissionOutbox, { order_id: other })).toMatchObject({ status: 'failed', last_error: 'nope' });
  });
});
