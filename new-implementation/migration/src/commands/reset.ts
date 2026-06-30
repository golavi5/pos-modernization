import { assertWriteSafe, type MigrationConfig } from '../core/config.js';
import { connectServer, connect } from '../core/db.js';
import {
  provisionTargetSchema,
  addLegacyIdColumns,
  DEFAULT_MIGRATIONS_DIR,
} from '../core/provision.js';
import { mapRuleTargets } from '../rules/_registry.js';

export type ResetOptions = { migrationsDir?: string };

/**
 * Drop + recreate the migration target DB, apply the authoritative backend
 * migrations, then add the migration-only `legacy_id` join columns. After this
 * the target is a clean, production-shaped schema ready for `import`.
 *
 * Guarded by assertWriteSafe — refuses to touch anything that isn't an
 * explicitly-named `*_migration` DB under NODE_ENV=migration.
 */
export async function runReset(
  cfg: MigrationConfig,
  opts: ResetOptions = {},
): Promise<void> {
  assertWriteSafe(cfg);
  const dbName = cfg.target.database;

  const server = await connectServer(cfg.target, { multipleStatements: false });
  try {
    await server.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await server.query(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await server.end();
  }

  const target = await connect(cfg.target);
  try {
    // FK ordering in the migrations is self-consistent; disable checks during
    // bulk DDL to avoid create-order sensitivity, matching `migration:run`.
    await target.query('SET FOREIGN_KEY_CHECKS = 0');
    const applied = await provisionTargetSchema(
      target,
      opts.migrationsDir ?? DEFAULT_MIGRATIONS_DIR,
    );
    await addLegacyIdColumns(target, mapRuleTargets());
    await target.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log(
      `[reset] ${dbName} recreated: ${applied} migration statements + ` +
        `legacy_id on [${mapRuleTargets().join(', ')}]`,
    );
  } finally {
    await target.end();
  }
}
