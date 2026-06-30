import type { Pool } from 'mysql2/promise';
import { allLegacyTables } from '../rules/_registry.js';

export async function assertAllTablesClassified(p: Pool, legacy: string): Promise<void> {
  const [tables] = await p.query<any[]>(
    `SELECT TABLE_NAME n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`, [legacy]);
  const known = new Set(allLegacyTables);
  const unknown = tables.map((t) => t.n).filter((n) => !known.has(n));
  if (unknown.length) throw new Error(`unclassified legacy tables (need a map or skip rule): ${unknown.join(', ')}`);
}
