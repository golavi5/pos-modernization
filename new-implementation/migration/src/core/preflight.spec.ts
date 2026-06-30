import { describe, it, expect } from 'vitest';
import { unknownTables, assertNoUnknownTables } from './preflight.js';

describe('unknownTables', () => {
  it('returns legacy tables with no rule', () => {
    expect(unknownTables(['tblCustomers', 'tblAudit'], ['tblCustomers'])).toEqual([
      'tblAudit',
    ]);
  });

  it('is empty when every legacy table is acknowledged', () => {
    expect(unknownTables(['tblCustomers'], ['tblCustomers', 'tblProducts'])).toEqual(
      [],
    );
  });

  it('assert throws naming the offenders', () => {
    expect(() => assertNoUnknownTables(['tblGhost'], [])).toThrow(/tblGhost/);
  });
});
