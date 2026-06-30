import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import mysql from 'mysql2/promise';
import { provisionTarget } from '../src/core/provision.js';
import { runImport } from '../src/commands/import.js';
import { runVerify } from '../src/commands/verify.js';
import { buildReport } from '../src/core/reporter.js';

const here = dirname(fileURLToPath(import.meta.url));
let container: StartedMySqlContainer;

beforeAll(async () => {
  process.env.NODE_ENV = 'migration';
  container = await new MySqlContainer('mysql:8.0').withRootPassword('root').start();
  const host = container.getHost(), port = container.getPort();
  process.env.DB_HOST = host; process.env.DB_PORT = String(port);
  process.env.DB_USER = 'root'; process.env.DB_PASSWORD = 'root';
  process.env.LEGACY_DB_NAME = 'pos_legacy'; process.env.TARGET_DB_NAME = 'pos_db_migration';

  const c = await mysql.createConnection({ host, port, user: 'root', password: 'root', multipleStatements: true });
  await c.query('CREATE DATABASE pos_legacy CHARACTER SET utf8mb4');
  await c.query('USE pos_legacy');
  await c.query(readFileSync(join(here, 'fixtures/legacy-sample.sql'), 'utf8'));
  await c.end();

  await provisionTarget({ host, port, user: 'root', password: 'root', database: 'pos_db_migration' });
}, 180_000);

afterAll(async () => { await container?.stop(); });

describe('M4 e2e parity (real schema, synthetic data)', () => {
  it('imports then verifies with zero mismatches', async () => {
    const imp = buildReport('import', await runImport(), '2026-06-29T00:00:00.000Z');
    expect(imp.summary.errors).toBe(0);
    const ver = buildReport('verify', await runVerify(), '2026-06-29T00:00:00.000Z');
    expect(ver.exitCode).toBe(0);
    expect(ver.summary.mismatches).toBe(0);
    expect(ver.summary.missing).toBe(0);
  });
  it('is idempotent — second import keeps verify green', async () => {
    await runImport();
    expect(buildReport('verify', await runVerify(), '2026-06-29T00:00:00.000Z').exitCode).toBe(0);
  });
});
