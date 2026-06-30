import { describe, it, expect } from 'vitest';
import { loadConfig, assertWriteSafe } from './config.js';

const base = {
  NODE_ENV: 'migration',
  TARGET_DB_NAME: 'pos_db_migration',
} as NodeJS.ProcessEnv;

describe('assertWriteSafe', () => {
  it('passes for a properly-named migration target in migration env', () => {
    expect(() => assertWriteSafe(loadConfig(base))).not.toThrow();
  });

  it('refuses when NODE_ENV is not exactly "migration"', () => {
    for (const NODE_ENV of ['production', 'development', undefined, 'Migration']) {
      expect(() => assertWriteSafe(loadConfig({ ...base, NODE_ENV }))).toThrow(
        /NODE_ENV must be exactly/,
      );
    }
  });

  it('refuses a target whose name does not end in _migration', () => {
    expect(() =>
      assertWriteSafe(loadConfig({ ...base, TARGET_DB_NAME: 'pos_db' })),
    ).toThrow(/must end in/);
  });

  it('refuses the live pos_db even with a tricky suffix attempt', () => {
    expect(() =>
      assertWriteSafe(loadConfig({ ...base, TARGET_DB_NAME: 'mysql' })),
    ).toThrow();
  });
});

describe('loadConfig', () => {
  it('defaults legacy to :3309 and target to :3308', () => {
    const cfg = loadConfig(base);
    expect(cfg.legacy.port).toBe(3309);
    expect(cfg.target.port).toBe(3308);
  });
});
