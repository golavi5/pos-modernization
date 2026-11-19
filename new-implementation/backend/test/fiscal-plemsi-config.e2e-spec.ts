/**
 * SPEC-FISC-003 T-02 against a real MySQL 8: the per-issuer Plemsi token is stored
 * envelope-encrypted and only decrypted in memory to build the adapter. Same
 * throwaway DB as the other e2e specs (port 3319, schema dropped and rebuilt from
 * the migrations):  npm run test:e2e
 */
import 'reflect-metadata';
import { randomBytes } from 'crypto';
import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { FiscalModule } from '../src/modules/fiscal/fiscal.module';
import { PlemsiConfigService } from '../src/modules/fiscal/emission/plemsi/plemsi-config.service';

const COMPANY_A = '11111111-1111-4111-8111-111111111111';
const COMPANY_B = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'plemsi-secret-token-0123456789';

describe('plemsi config (e2e, real MySQL)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let user = { company_id: COMPANY_A, roles: ['admin'] };
  const kek = randomBytes(32).toString('base64');

  beforeAll(async () => {
    process.env.FISCAL_KEK = kek;
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
  });

  afterAll(async () => {
    delete process.env.FISCAL_KEK;
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  it('stores the token encrypted and never returns it', async () => {
    await http().get('/fiscal/v1/admin/plemsi-config').expect(404);
    await http().put('/fiscal/v1/admin/plemsi-config').send({ environment: 'sandbox', token: TOKEN }).expect(204);
    const [row] = await ds.query('SELECT * FROM fiscal_plemsi_config WHERE company_id = ?', [COMPANY_A]);
    expect(JSON.stringify(row)).not.toContain(TOKEN);
    expect(Buffer.from(row.token_encrypted, 'base64').toString('latin1')).not.toContain('plemsi');
    const got = await http().get('/fiscal/v1/admin/plemsi-config').expect(200);
    expect(got.body).toMatchObject({ environment: 'sandbox' });
    expect(JSON.stringify(got.body)).not.toContain(TOKEN);
  });

  it('upserts on a second PUT and rejects an unknown environment or a short token', async () => {
    await http().put('/fiscal/v1/admin/plemsi-config').send({ environment: 'production', token: TOKEN }).expect(204);
    expect(await ds.query('SELECT COUNT(*) c FROM fiscal_plemsi_config WHERE company_id = ?', [COMPANY_A])).toEqual([{ c: '1' }]);
    await http().put('/fiscal/v1/admin/plemsi-config').send({ environment: 'http://evil.test', token: TOKEN }).expect(400);
    await http().put('/fiscal/v1/admin/plemsi-config').send({ environment: 'sandbox', token: 'x' }).expect(400);
  });

  it('adapterFor decrypts in memory and calls the environment host with Bearer <token>', async () => {
    await http().put('/fiscal/v1/admin/plemsi-config').send({ environment: 'sandbox', token: TOKEN }).expect(204);
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { state: 'Emitted' } }), { status: 200 }));
    try {
      const adapter = await app.get(PlemsiConfigService).adapterFor(COMPANY_A);
      await adapter.getStatus('pos', 'POS', 1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url.startsWith('https://pruebas.plemsi.com/')).toBe(true);
      expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    } finally {
      spy.mockRestore();
    }
  });

  it('emission can only be switched on with numbering and a fiscal profile in place', async () => {
    user = { company_id: COMPANY_A, roles: ['admin'] };
    await http().put('/fiscal/v1/admin/plemsi-config').send({ environment: 'sandbox', token: TOKEN }).expect(204);
    const patch = (b: object) => http().patch('/fiscal/v1/admin/plemsi-config/emission').send(b);
    await patch({ enabled: true }).expect(400); // no prefix/resolution
    await patch({ enabled: true, pos_prefix: 'POS', pos_resolution: '18760' }).expect(400); // no profile
    await ds.query("INSERT INTO fiscal_profiles (id, company_id, nit, dv, legal_name, responsibility_codes) VALUES (UUID(), ?, '800197268', '4', 'Empresa SAS', '[]')", [COMPANY_A]);
    await patch({ enabled: true, pos_prefix: 'POS', pos_resolution: '18760' }).expect(204);
    expect((await http().get('/fiscal/v1/admin/plemsi-config').expect(200)).body).toMatchObject({ emission_enabled: true, pos_prefix: 'POS', pos_resolution: '18760' });
    await patch({ enabled: false }).expect(204); // keeps numbering, switches off
    expect((await http().get('/fiscal/v1/admin/plemsi-config').expect(200)).body).toMatchObject({ emission_enabled: false, pos_prefix: 'POS' });
    await ds.query('DELETE FROM fiscal_profiles WHERE company_id = ?', [COMPANY_A]);
  });

  it('a row moved to another company does not decrypt (AAD binding)', async () => {
    await ds.query('UPDATE fiscal_plemsi_config SET company_id = ? WHERE company_id = ?', [COMPANY_B, COMPANY_A]);
    await expect(app.get(PlemsiConfigService).adapterFor(COMPANY_B)).rejects.toThrow();
  });

  it('without a KEK the PUT fails with the fiscal error shape and stores nothing', async () => {
    const saved = process.env.FISCAL_KEK;
    delete process.env.FISCAL_KEK;
    try {
      user = { company_id: COMPANY_A, roles: ['admin'] };
      const res = await http().put('/fiscal/v1/admin/plemsi-config').send({ environment: 'sandbox', token: TOKEN }).expect(500);
      expect(res.body.error.code).toBe('internal_error');
      expect(await ds.query('SELECT COUNT(*) c FROM fiscal_plemsi_config WHERE company_id = ?', [COMPANY_A])).toEqual([{ c: '0' }]);
    } finally {
      process.env.FISCAL_KEK = saved;
    }
  });
});
