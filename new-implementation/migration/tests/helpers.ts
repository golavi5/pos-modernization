import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MigrationConfig } from '../src/core/config.js';

export const ROOT_PW = 'rootpw';
export const TARGET_DB = 'pos_db_migration';
export const LEGACY_DB = 'pos_legacy';

export function startTarget(): Promise<StartedMySqlContainer> {
  return new MySqlContainer('mysql:8.0').withDatabase(TARGET_DB).withRootPassword(ROOT_PW).start();
}

/** Boot a legacy container and load a fixture SQL file into it. */
export async function startLegacy(fixtureFile: string): Promise<StartedMySqlContainer> {
  const c = await new MySqlContainer('mysql:8.0').withDatabase(LEGACY_DB).withRootPassword(ROOT_PW).start();
  const sql = await readFile(join(__dirname, 'fixtures', fixtureFile), 'utf8');
  const conn = await mysql.createConnection({
    host: c.getHost(), port: c.getPort(), user: 'root',
    password: ROOT_PW, database: LEGACY_DB, multipleStatements: true,
  });
  await conn.query(sql);
  await conn.end();
  return c;
}

export function makeCfg(
  legacy: StartedMySqlContainer,
  target: StartedMySqlContainer,
): MigrationConfig {
  const l = { host: legacy.getHost(), port: legacy.getPort(), user: 'root', password: ROOT_PW, database: LEGACY_DB };
  const t = { host: target.getHost(), port: target.getPort(), user: 'root', password: ROOT_PW, database: TARGET_DB };
  return {
    NODE_ENV: 'migration',
    LEGACY_DB_HOST: l.host, LEGACY_DB_PORT: l.port, LEGACY_DB_USER: l.user, LEGACY_DB_PASSWORD: l.password, LEGACY_DB_NAME: l.database,
    TARGET_DB_HOST: t.host, TARGET_DB_PORT: t.port, TARGET_DB_USER: t.user, TARGET_DB_PASSWORD: t.password, TARGET_DB_NAME: t.database,
    legacy: l, target: t,
  };
}

export async function targetRowCount(target: StartedMySqlContainer, table: string): Promise<number> {
  const conn = await mysql.createConnection({
    host: target.getHost(), port: target.getPort(), user: 'root', password: ROOT_PW, database: TARGET_DB,
  });
  const [rows] = await conn.query<any[]>(`SELECT COUNT(*) AS n FROM \`${table}\``);
  await conn.end();
  return Number(rows[0].n);
}
