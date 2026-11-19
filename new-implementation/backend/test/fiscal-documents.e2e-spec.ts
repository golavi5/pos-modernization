/**
 * SPEC-FISC-003 T-06/T-07/T-08 over HTTP against a real MySQL 8: the documents API,
 * the reconciliation view and the per-sale status, with a scripted provider (no
 * network). Same throwaway DB as the other e2e specs (port 3319).
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
import { EmissionOutbox } from '../src/modules/fiscal/outbox/outbox.entity';
import { OutboxWorker } from '../src/modules/fiscal/outbox/outbox.worker';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const ALL = ['documents:read', 'documents:write'];
const invoice = {
  type: 'invoice',
  buyer: null,
  lines: [{ code: 'A', description: 'Item', quantity: 1, unit_price: 100, iva_rate: 0, subtotal: 100, iva_amount: 0, total: 100 }],
};
const asUser = (company_id: string, roles: string[]) => ({ company_id, roles, hasAnyRole: (r: string[]) => r.some((x) => roles.includes(x)) });

describe('documents API, reconciliation and sale status (e2e, real MySQL)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let worker: OutboxWorker;
  let keyA: string;
  let keyB: string;
  let user = asUser(A, ['admin']);
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
    const keys = app.get(ApiKeysService);
    keyA = (await keys.create(A, 'a', ALL)).key;
    keyB = (await keys.create(B, 'b', ALL)).key;
    await ds.manager.insert(PlemsiConfig, { company_id: A, environment: 'sandbox', wrapped_data_key: 'x', token_encrypted: 'x', emission_enabled: true, pos_prefix: 'POS', pos_resolution: '1', invoice_prefix: 'FV', invoice_resolution: '99' });
    await ds.manager.insert(FiscalProfile, { company_id: A, nit: '800197268', dv: '4', legal_name: 'Empresa SAS', responsibility_codes: [] });
  });

  afterAll(async () => app?.close());
  beforeEach(() => Object.values(provider).forEach((f) => f.mockReset()));

  const http = () => request(app.getHttpServer());
  const post = (key: string, idem: string, body: object) =>
    http().post('/fiscal/v1/documents').set('Authorization', `Bearer ${key}`).set('Idempotency-Key', idem).send(body);
  const get = (key: string, path: string) => http().get(`/fiscal/v1/documents${path}`).set('Authorization', `Bearer ${key}`);

  describe('documents API', () => {
    let id: string;

    it('queues an invoice: 202 pending, no number yet; a repeat with the same key does not duplicate', async () => {
      const r = await post(keyA, 'd-1', invoice).expect(202);
      expect(r.body).toMatchObject({ type: 'invoice', status: 'pending', number: null, cufe: null });
      id = r.body.id;
      const again = await post(keyA, 'd-1', invoice).expect(202);
      expect(again.body.id).toBe(id);
      expect(await ds.manager.count(EmissionOutbox, { where: { company_id: A, document_type: 'invoice' } })).toBe(1);
      await post(keyA, 'd-1', { ...invoice, head_note: 'otro' }).expect(422);
    });

    it('requires the Idempotency-Key and validates the body', async () => {
      await http().post('/fiscal/v1/documents').set('Authorization', `Bearer ${keyA}`).send(invoice).expect(400);
      const noRef = await post(keyA, 'd-2', { ...invoice, type: 'credit_note' }).expect(400);
      expect(noRef.body.error.code).toBe('validation_failed');
      await post(keyA, 'd-3', { ...invoice, lines: [{ ...invoice.lines[0], quantity: 0 }] }).expect(400);
      await post(keyA, 'd-4', { ...invoice, lines: [] }).expect(400);
      await post(keyA, 'd-5', { ...invoice, type: 'pos' }).expect(400);
    });

    it('refuses what the issuer has not set up: no emission, or no numbering for that type', async () => {
      const noEmission = await post(keyB, 'd-6', invoice).expect(400);
      expect(noEmission.body.error.message).toContain('not enabled');
      const cn = { ...invoice, type: 'credit_note', reference: { number: 'FV1', cufe: 'c', issue_date: '2026-01-01' }, discrepancy_code: 2, discrepancy_description: 'x' };
      const noNumbering = await post(keyA, 'd-7', cn).expect(400);
      expect(noNumbering.body.error.message).toContain('credit_note');
    });

    it('needs the documents:write scope to create', async () => {
      const { key } = await app.get(ApiKeysService).create(A, 'ro', ['documents:read']);
      await post(key, 'd-8', invoice).expect(403);
      await get(key, `/${id}`).expect(200);
    });

    it('the worker validates it and the client sees number, CUFE and QR', async () => {
      provider.nextNumber.mockResolvedValue(7);
      provider.emit.mockResolvedValue({ outcome: 'submitted', cude: 'cufe-1', qr: 'qr-1', verdict: 'accepted', reason: null });
      await worker.tick();
      const r = await get(keyA, `/${id}`).expect(200);
      expect(r.body).toMatchObject({ status: 'validated', prefix: 'FV', number: 7, cufe: 'cufe-1', qr: 'qr-1' });
      expect(JSON.stringify(r.body)).not.toContain('draft');
    });

    it('lists by status with a cursor and isolates issuers', async () => {
      await post(keyA, 'd-9', invoice).expect(202);
      const all = await get(keyA, '?limit=1').expect(200);
      expect(all.body.data).toHaveLength(1);
      expect(all.body.next_cursor).toBe(all.body.data[0].id);
      const validated = await get(keyA, '?status=validated').expect(200);
      expect(validated.body.data.map((d: { id: string }) => d.id)).toEqual([id]);
      expect((await get(keyB, '').expect(200)).body.data).toEqual([]);
      await get(keyB, `/${id}`).expect(404);
      await get(keyB, `/${id}/pdf`).expect(404);
    });

    it('serves the PDF only once there is a CUFE', async () => {
      const [pending] = await ds.manager.find(EmissionOutbox, { where: { company_id: A, status: 'pending' } });
      await get(keyA, `/${pending.id}/pdf`).expect(409);
      provider.getPdf.mockResolvedValue({ base64: Buffer.from('%PDF-test').toString('base64'), filename: 'FV 7/../x.pdf' });
      const pdf = await get(keyA, `/${id}/pdf`).buffer(true).parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      }).expect(200);
      expect(pdf.headers['content-type']).toContain('application/pdf');
      expect(pdf.headers['content-disposition']).toBe('attachment; filename="FV_7_.._x.pdf"');
      expect((pdf.body as Buffer).toString()).toBe('%PDF-test');
      expect(provider.getPdf).toHaveBeenCalledWith('cufe-1');
    });
  });

  describe('reconciliation and receipt status', () => {
    const mk = (over: Partial<EmissionOutbox>) =>
      ds.manager.insert(EmissionOutbox, { company_id: A, status: 'pending', document_type: 'pos', draft: null, next_attempt_at: new Date(), ...over }).then((r) => r.identifiers[0].id as string);
    const orderOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    const recon = () => http().get('/fiscal/v1/admin/reconciliation');
    let failedId: string;
    let rejectedId: string;

    beforeAll(async () => {
      await ds.query('DELETE FROM fiscal_emission_outbox');
      failedId = await mk({ order_id: orderOf(1), status: 'failed', last_error: 'Missing fiscal profile' });
      rejectedId = await mk({ order_id: orderOf(2), status: 'rejected', last_error: 'FAU06' });
      await mk({ order_id: orderOf(3), status: 'sent', created_at: new Date(Date.now() - 2 * 3600_000) }); // stuck: old
      await mk({ order_id: orderOf(4), status: 'pending', attempts: 3 }); // stuck: retried
      await mk({ order_id: orderOf(5), status: 'pending' }); // fresh: fine
      await mk({ order_id: orderOf(6), status: 'validated', prefix: 'POS', number: 5, cufe: 'cu6', qr: 'qr6' });
      await mk({ company_id: B, order_id: orderOf(7), status: 'failed' });
    });

    it('lists failed, rejected and stuck documents of the company only', async () => {
      const r = await recon().expect(200);
      expect(r.body.map((x: { kind: string }) => x.kind).sort()).toEqual(['failed', 'rejected', 'stuck', 'stuck']);
      const ids = r.body.map((x: { id: string }) => x.id);
      expect(ids).toEqual(expect.arrayContaining([failedId, rejectedId]));
      expect(r.body.find((x: { id: string }) => x.id === failedId)).toMatchObject({ kind: 'failed', last_error: 'Missing fiscal profile' });
      expect(JSON.stringify(r.body)).not.toContain('draft');
    });

    it('is for admins and managers, not cashiers', async () => {
      user = asUser(A, ['cashier']);
      await recon().expect(403);
      await http().post(`/fiscal/v1/admin/reconciliation/${failedId}/requeue`).expect(403);
      user = asUser(A, ['manager']);
      await recon().expect(200);
      user = asUser(A, ['admin']);
    });

    it('requeues a failed document, and only a failed one of this company', async () => {
      await http().post(`/fiscal/v1/admin/reconciliation/${rejectedId}/requeue`).expect(409);
      await http().post(`/fiscal/v1/admin/reconciliation/${failedId}/requeue`).expect(204);
      expect(await ds.manager.findOneByOrFail(EmissionOutbox, { id: failedId })).toMatchObject({ status: 'pending', attempts: 0, last_error: null });
      const other = (await ds.manager.findOneByOrFail(EmissionOutbox, { order_id: orderOf(7) })).id;
      await http().post(`/fiscal/v1/admin/reconciliation/${other}/requeue`).expect(404);
    });

    it('sale status for the receipt: not_applicable, pending, attention, validated with CUFE and QR', async () => {
      const status = async (n: number) => (await http().get(`/fiscal/v1/sales/${orderOf(n)}/status`).expect(200)).body;
      expect(await status(99)).toEqual({ status: 'not_applicable' });
      expect(await status(5)).toEqual({ status: 'pending' });
      expect(await status(3)).toEqual({ status: 'pending' }); // sent = still waiting for DIAN
      expect(await status(2)).toEqual({ status: 'attention' }); // rejected: no internal reason for a cashier
      expect(await status(6)).toEqual({ status: 'validated', prefix: 'POS', number: 5, cufe: 'cu6', qr: 'qr6' });
      expect(await status(7)).toEqual({ status: 'not_applicable' }); // another company's sale
      user = asUser(A, ['cashier']);
      await http().get(`/fiscal/v1/sales/${orderOf(6)}/status`).expect(200); // any role
      user = asUser(A, ['admin']);
    });
  });
});
