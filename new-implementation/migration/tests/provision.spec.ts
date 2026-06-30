import { describe, it, expect } from 'vitest';
import { assertMigrationDb } from '../src/core/targetDb.js';

describe('assertMigrationDb', () => {
  it('accepts a _migration database', () => {
    expect(() => assertMigrationDb('pos_db_migration')).not.toThrow();
  });
  it('rejects prod (safety rail)', () => {
    expect(() => assertMigrationDb('pos_db')).toThrow(/_migration/);
  });
});
