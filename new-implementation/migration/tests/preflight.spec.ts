import { describe, it, expect } from 'vitest';
import { assertAllTablesClassified } from '../src/core/preflight.js';

describe('assertAllTablesClassified', () => {
  it('throws when an unclassified table is found', async () => {
    const stubPool = {
      query: async () => [[{ n: 'empresas' }, { n: 'mystery_table_xyz' }], []],
    } as any;

    await expect(
      assertAllTablesClassified(stubPool, 'pos_legacy')
    ).rejects.toThrow(/unclassified legacy tables.*mystery_table_xyz/);
  });

  it('passes when all tables are classified', async () => {
    const stubPool = {
      query: async () => [[{ n: 'empresas' }, { n: 'clientes' }], []],
    } as any;

    await expect(
      assertAllTablesClassified(stubPool, 'pos_legacy')
    ).resolves.toBeUndefined();
  });
});
