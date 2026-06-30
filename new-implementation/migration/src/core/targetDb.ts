import mysql, { type Pool } from 'mysql2/promise';

export function assertMigrationDb(name: string): void {
  if (!/_migration$/.test(name)) {
    throw new Error(`refusing to operate on "${name}": target DB name must end in _migration`);
  }
}

// One pool, no default schema — legacy + target referenced by qualified name.
export function pool(): Pool {
  return mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3308),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    charset: 'utf8mb4',
    dateStrings: false,
    multipleStatements: false,
  });
}

export const targetSchema = (): string => {
  const n = process.env.TARGET_DB_NAME ?? 'pos_db_migration';
  assertMigrationDb(n);
  return n;
};

export const legacySchema = (): string =>
  process.env.LEGACY_DB_NAME ?? 'pos_legacy';
