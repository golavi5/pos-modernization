import { z } from 'zod';

/**
 * Migration config + SAFETY RAILS.
 *
 * The migration target lives on the *same MySQL server* as the live `pos_db`
 * (design §4: legacy on :3309, target on :3308). The only things standing
 * between M4 and the production database are the two guards below. They are
 * load-bearing — do not relax them.
 */

const RawEnv = z.object({
  // Legacy source DB (the frozen dump, read-only).
  LEGACY_DB_HOST: z.string().default('localhost'),
  LEGACY_DB_PORT: z.coerce.number().default(3309),
  LEGACY_DB_USER: z.string().default('root'),
  LEGACY_DB_PASSWORD: z.string().default(''),
  LEGACY_DB_NAME: z.string().default('pos_legacy'),

  // Migration target DB (recreated each run, never the live DB).
  TARGET_DB_HOST: z.string().default('localhost'),
  TARGET_DB_PORT: z.coerce.number().default(3308),
  TARGET_DB_USER: z.string().default('root'),
  TARGET_DB_PASSWORD: z.string().default(''),
  TARGET_DB_NAME: z.string().default('pos_db_migration'),

  NODE_ENV: z.string().optional(),
});

export type MigrationConfig = z.infer<typeof RawEnv> & {
  legacy: DbConn;
  target: DbConn;
};

export type DbConn = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

/** Names that may NEVER be used as a migration target. */
const FORBIDDEN_TARGETS = new Set(['pos_db', 'mysql', 'information_schema', 'sys']);

/**
 * Guard for write commands (`reset`, `import`). Refuses to run unless the
 * environment is explicitly `migration` AND the target DB name ends in
 * `_migration` and is not a known live/system DB.
 */
export function assertWriteSafe(cfg: MigrationConfig): void {
  if (cfg.NODE_ENV !== 'migration') {
    throw new Error(
      `Refusing to run a write command: NODE_ENV must be exactly "migration" ` +
        `(got ${JSON.stringify(cfg.NODE_ENV)}). This guards the live database.`,
    );
  }
  const name = cfg.target.database;
  if (!/_migration$/.test(name) || FORBIDDEN_TARGETS.has(name)) {
    throw new Error(
      `Refusing to write to target database "${name}": the name must end in ` +
        `"_migration" (wrong-DB protection).`,
    );
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): MigrationConfig {
  const raw = RawEnv.parse(env);
  return {
    ...raw,
    legacy: {
      host: raw.LEGACY_DB_HOST,
      port: raw.LEGACY_DB_PORT,
      user: raw.LEGACY_DB_USER,
      password: raw.LEGACY_DB_PASSWORD,
      database: raw.LEGACY_DB_NAME,
    },
    target: {
      host: raw.TARGET_DB_HOST,
      port: raw.TARGET_DB_PORT,
      user: raw.TARGET_DB_USER,
      password: raw.TARGET_DB_PASSWORD,
      database: raw.TARGET_DB_NAME,
    },
  };
}
