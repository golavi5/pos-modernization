import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Conn } from './db.js';

/**
 * Provision the migration target schema from the BACKEND's TypeORM migrations.
 *
 * Per SPEC-CUT-001 B-05 the entities/migrations — not `database/schema.sql` —
 * are authoritative. TypeORM `migration:generate` always emits raw
 * `await queryRunner.query(`…`)` statements, so we read those migration files,
 * extract the `up()` SQL, and apply it verbatim to the target. This is the
 * exact DDL `migration:run` would apply, but self-contained (no backend
 * toolchain needed in the test container) and drift-free (reads the real
 * files, no snapshot to maintain).
 */

/** Default location of the backend migrations, relative to the migration workspace. */
export const DEFAULT_MIGRATIONS_DIR = join(
  process.cwd(),
  '..',
  'backend',
  'src',
  'database',
  'migrations',
);

/**
 * Extract the ordered list of SQL statements from a TypeORM migration file's
 * `up()` method. Pure + testable. Inner identifier backticks are escaped as
 * `\`` in the TS template literal; we unescape them back to real backticks.
 */
export function extractMigrationSql(fileContent: string): string[] {
  const upStart = fileContent.search(/async\s+up\s*\(/);
  if (upStart === -1) return [];
  const downStart = fileContent.search(/async\s+down\s*\(/);
  const body =
    downStart === -1 ? fileContent.slice(upStart) : fileContent.slice(upStart, downStart);

  const re = /queryRunner\.query\(\s*`((?:\\`|[^`])*)`/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out.push(m[1].replace(/\\`/g, '`'));
  }
  return out;
}

/** Read + concatenate all migrations (filename order = timestamp order). */
export async function collectMigrationSql(dir: string): Promise<string[]> {
  const files = (await readdir(dir))
    .filter((f) => /\.ts$|\.js$/.test(f) && !/\.spec\./.test(f))
    .sort();
  const stmts: string[] = [];
  for (const f of files) {
    const content = await readFile(join(dir, f), 'utf8');
    stmts.push(...extractMigrationSql(content));
  }
  return stmts;
}

/** Apply the backend migrations' DDL to the target connection. */
export async function provisionTargetSchema(
  conn: Conn,
  dir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<number> {
  const stmts = await collectMigrationSql(dir);
  if (stmts.length === 0) {
    throw new Error(`No migration SQL found in ${dir}`);
  }
  for (const sql of stmts) {
    await conn.query(sql);
  }
  return stmts.length;
}

/**
 * Add the migration-only `legacy_id` join column + unique index to each
 * target table. Per the recorded decision (supersedes design §3/§5), this
 * lives ONLY on the migration target, never on the live schema — it is
 * verify's join key, not production schema. Idempotent.
 */
export async function addLegacyIdColumns(
  conn: Conn,
  tables: string[],
): Promise<void> {
  for (const t of tables) {
    await conn.query(
      `ALTER TABLE \`${t}\` ADD COLUMN \`legacy_id\` VARCHAR(64) NULL`,
    );
    await conn.query(
      `ALTER TABLE \`${t}\` ADD UNIQUE INDEX \`uq_${t}_legacy_id\` (\`legacy_id\`)`,
    );
  }
}
