import mysql from 'mysql2/promise';
import type { DbConn } from './config.js';

/**
 * Thin mysql2 helpers shared by the legacy (read-only) and target clients.
 * The design names these legacyDb.ts / targetDb.ts; they are the same code
 * pointed at different connections, so they live together here.
 */

export type Conn = mysql.Connection;

export async function connect(conn: DbConn): Promise<Conn> {
  return mysql.createConnection({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    multipleStatements: false,
    dateStrings: false,
    // DECIMAL/BIGINT come back as strings; the differ normalizes them.
    decimalNumbers: false,
    supportBigNumbers: true,
  });
}

/** A server-side connection without a default DB — for reset (CREATE DATABASE). */
export async function connectServer(
  conn: DbConn,
  opts: { multipleStatements?: boolean } = {},
): Promise<Conn> {
  return mysql.createConnection({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    multipleStatements: opts.multipleStatements ?? false,
  });
}

export async function listTables(c: Conn, database: string): Promise<string[]> {
  const [rows] = await c.query<mysql.RowDataPacket[]>(
    `SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ?`,
    [database],
  );
  return rows.map((r) => String(r.t));
}

export async function tableColumns(
  c: Conn,
  database: string,
  table: string,
): Promise<string[]> {
  const [rows] = await c.query<mysql.RowDataPacket[]>(
    `SELECT column_name AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?`,
    [database, table],
  );
  return rows.map((r) => String(r.c));
}

export async function countRows(c: Conn, table: string): Promise<number> {
  const [rows] = await c.query<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM \`${table}\``,
  );
  return Number(rows[0]?.n ?? 0);
}
