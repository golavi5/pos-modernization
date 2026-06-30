import 'reflect-metadata';
import mysql from 'mysql2/promise';
import { assertMigrationDb } from './targetDb.js';

export type TargetConn = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export async function provisionTarget(conn: TargetConn): Promise<void> {
  assertMigrationDb(conn.database);

  // Drop and recreate the target schema
  const admin = await mysql.createConnection({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    multipleStatements: true,
  });
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${conn.database}\``);
    await admin.query(`CREATE DATABASE \`${conn.database}\` CHARACTER SET utf8mb4`);
  } finally {
    await admin.end();
  }

  // Import backend's dataSourceOptions and run TypeORM migrations against target.
  // Dynamic import keeps tsc from pulling the backend file into rootDir resolution.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { dataSourceOptions } = await import('../../../backend/src/database/data-source.js') as any;

  const { DataSource } = await import('typeorm');
  const ds = new (DataSource as any)({
    ...dataSourceOptions,
    host: conn.host,
    port: conn.port,
    username: conn.user,
    password: conn.password,
    database: conn.database,
    synchronize: false,
    migrationsRun: false,
  });
  await ds.initialize();
  try {
    await ds.runMigrations({ transaction: 'all' });
  } finally {
    await ds.destroy();
  }
}
