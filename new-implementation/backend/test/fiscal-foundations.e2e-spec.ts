/**
 * SPEC-FISC-002 acceptance, against a real MySQL 8. The schema comes from the
 * TypeORM migrations (dropSchema + migrationsRun), so this also proves the
 * migration builds a working schema. Needs a THROWAWAY database:
 *   docker run -d --name pos-lock-test -e MYSQL_ROOT_PASSWORD=locktest \
 *     -e MYSQL_DATABASE=pos_lock_test -p 3319:3306 mysql:8.0
 *   npm run test:e2e
 * The target is hard-coded on purpose: it must never fall back to DB_NAME.
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
import { FiscalModule } from '../src/modules/fiscal/fiscal.module';
import { ApiKeysService } from '../src/modules/fiscal/access/api-keys.service';

const COMPANY_A = '11111111-1111-4111-8111-111111111111';
const COMPANY_B = '22222222-2222-4222-8222-222222222222';
const ALL = ['profile:read', 'profile:write', 'third-parties:read', 'third-parties:write'];
const body = (nit: string, name = 'Proveedor') => ({ nit, name, responsibility_codes: ['O-13'] });

describe('fiscal foundations (e2e, real MySQL)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let keys: ApiKeysService;
  let keyA: string;
  let keyB: string;
  // RolesGuard calls `user.hasAnyRole`, so the fake user must answer it like the real entity does.
  const asUser = (company_id: string, roles: string[]) => ({ company_id, roles, hasAnyRole: (r: string[]) => r.some((x) => roles.includes(x)) });
  let adminUser = asUser(COMPANY_A, ['admin']);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
        TypeOrmModule.forRoot({
          ...(dataSourceOptions as object),
          host: '127.0.0.1',
          port: 3319,
          username: 'root',
          password: 'locktest',
          database: 'pos_lock_test',
          synchronize: false,
          dropSchema: true,
          migrationsRun: true,
        } as never),
        FiscalModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = adminUser;
          return true;
        },
      })
      .compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    keys = app.get(ApiKeysService);
    keyA = (await keys.create(COMPANY_A, 'app-a', ALL)).key;
    keyB = (await keys.create(COMPANY_B, 'app-b', ALL)).key;
  });

  afterAll(async () => app?.close());

  const http = () => request(app.getHttpServer());
  const post = (key: string, idem: string, b: object) =>
    http().post('/fiscal/v1/third-parties').set('Authorization', `Bearer ${key}`).set('Idempotency-Key', idem).send(b);

  it('an app creates and reads its third party; another issuer cannot see it', async () => {
    const created = await post(keyA, 'k-1', body('800197268-4')).expect(201);
    expect(created.body).toMatchObject({ nit: '800197268', dv: '4', company_id: COMPANY_A });

    const listA = await http().get('/fiscal/v1/third-parties').set('Authorization', `Bearer ${keyA}`).expect(200);
    expect(listA.body.data.map((t: { id: string }) => t.id)).toContain(created.body.id);

    const listB = await http().get('/fiscal/v1/third-parties').set('Authorization', `Bearer ${keyB}`).expect(200);
    expect(listB.body.data).toEqual([]);
    await http().get(`/fiscal/v1/third-parties/${created.body.id}`).set('Authorization', `Bearer ${keyB}`).expect(404);
  });

  it('the same Idempotency-Key and body does not duplicate; a different body is 422', async () => {
    const first = await post(keyA, 'k-2', body('900123456-8')).expect(201);
    const again = await post(keyA, 'k-2', body('900123456-8')).expect(201);
    expect(again.body.id).toBe(first.body.id);
    expect(await ds.query("SELECT COUNT(*) c FROM fiscal_third_parties WHERE nit='900123456'")).toEqual([{ c: '1' }]);
    const res = await post(keyA, 'k-2', body('900123456-8', 'Otro nombre')).expect(422);
    expect(res.body.error.code).toBe('unprocessable');
  });

  it('two concurrent requests with one key create a single row', async () => {
    const [r1, r2] = await Promise.all([post(keyA, 'k-3', body('123456789-6')), post(keyA, 'k-3', body('123456789-6'))]);
    expect([r1.status, r2.status].sort()).toEqual(expect.arrayContaining([201]));
    expect([r1.status, r2.status].every((s) => s === 201 || s === 409)).toBe(true);
    expect(await ds.query("SELECT COUNT(*) c FROM fiscal_third_parties WHERE nit='123456789'")).toEqual([{ c: '1' }]);
  });

  it('a failed call releases its key so it can be retried', async () => {
    await post(keyA, 'k-4', body('800197268-4')).expect(409); // duplicate NIT for this issuer
    await post(keyA, 'k-4', body('40720042-4')).expect(201); // same key, fixed request
  });

  it('requires Idempotency-Key and validates the NIT check digit', async () => {
    await http().post('/fiscal/v1/third-parties').set('Authorization', `Bearer ${keyA}`).send(body('800197268-4')).expect(400);
    const bad = await post(keyA, 'k-5', body('800197268-5')).expect(400);
    expect(bad.body.error.code).toBe('validation_failed');
  });

  it('rejects missing, unknown and revoked keys (401) and missing scopes (403)', async () => {
    await http().get('/fiscal/v1/third-parties').expect(401);
    await http().get('/fiscal/v1/third-parties').set('Authorization', 'Bearer fsk_nope').expect(401);
    const { id, key } = await keys.create(COMPANY_A, 'tmp', ['third-parties:read']);
    await http().get('/fiscal/v1/third-parties').set('X-Api-Key', key).expect(200);
    await post(key, 'k-6', body('800197268-4')).expect(403);
    await keys.revoke(COMPANY_A, id);
    await http().get('/fiscal/v1/third-parties').set('X-Api-Key', key).expect(401);
  });

  it('a user JWT is not accepted as an app key', async () => {
    await http().get('/fiscal/v1/third-parties').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.x').expect(401);
  });

  it('paginates with limit and cursor', async () => {
    const p1 = await http().get('/fiscal/v1/third-parties?limit=1').set('Authorization', `Bearer ${keyA}`).expect(200);
    expect(p1.body.data).toHaveLength(1);
    expect(p1.body.next_cursor).toBe(p1.body.data[0].id);
    const p2 = await http()
      .get(`/fiscal/v1/third-parties?limit=1&cursor=${p1.body.next_cursor}`)
      .set('Authorization', `Bearer ${keyA}`)
      .expect(200);
    expect(p2.body.data[0].id).not.toBe(p1.body.data[0].id);
  });

  it('tenant admin issues a key; only its hash is stored; admin routes are tenant-scoped', async () => {
    adminUser = asUser(COMPANY_B, ['admin']);
    const res = await http().post('/fiscal/v1/admin/api-keys').send({ name: 'erp', scopes: ['profile:read'] }).expect(201);
    expect(res.body.key).toMatch(/^fsk_/);
    const [row] = await ds.query('SELECT key_hash, company_id FROM fiscal_api_keys WHERE id = ?', [res.body.id]);
    expect(row.company_id).toBe(COMPANY_B);
    expect(row.key_hash).not.toContain(res.body.key);
    await http().get('/fiscal/v1/admin/api-keys').expect(200).expect((r) => expect(r.body.some((k: { key?: string }) => k.key)).toBe(false));
    adminUser = asUser(COMPANY_A, ['admin']);
    await http().delete(`/fiscal/v1/admin/api-keys/${res.body.id}`).expect(404); // other tenant's key
    await http().post('/fiscal/v1/admin/api-keys').send({ name: 'x', scopes: ['bogus'] }).expect(400);
  });

  it('key management is admin-only: a cashier gets 403 on every route', async () => {
    const { id } = await keys.create(COMPANY_A, 'victim', ['profile:read']);
    adminUser = asUser(COMPANY_A, ['cashier']);
    await http().post('/fiscal/v1/admin/api-keys').send({ name: 'x', scopes: ['profile:read'] }).expect(403);
    await http().get('/fiscal/v1/admin/api-keys').expect(403);
    await http().delete(`/fiscal/v1/admin/api-keys/${id}`).expect(403);
    adminUser = asUser(COMPANY_A, ['admin']);
    await http().delete(`/fiscal/v1/admin/api-keys/${id}`).expect(204);
  });

  it('profile: upsert and read per issuer', async () => {
    const put = { nit: '900123456-8', legal_name: 'Empresa SAS', responsibility_codes: ['O-13'] };
    await http().get('/fiscal/v1/profile').set('Authorization', `Bearer ${keyA}`).expect(404);
    await http().put('/fiscal/v1/profile').set('Authorization', `Bearer ${keyA}`).send(put).expect(200);
    await http().put('/fiscal/v1/profile').set('Authorization', `Bearer ${keyA}`).send({ ...put, legal_name: 'Renombrada' }).expect(200);
    const got = await http().get('/fiscal/v1/profile').set('Authorization', `Bearer ${keyA}`).expect(200);
    expect(got.body).toMatchObject({ legal_name: 'Renombrada', dv: '8', habilitation_status: 'none' });
    await http().get('/fiscal/v1/profile').set('Authorization', `Bearer ${keyB}`).expect(404);
  });
});
