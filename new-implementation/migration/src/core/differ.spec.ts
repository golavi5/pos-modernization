import { describe, it, expect } from 'vitest';
import { valuesEqual, compareRow } from './differ.js';
import type { MapRule } from '../types/Rule.js';

describe('valuesEqual', () => {
  it('treats null/undefined as equal', () => {
    expect(valuesEqual(null, undefined)).toBe(true);
    expect(valuesEqual(null, '')).toBe(false);
  });

  it('compares DECIMAL strings to numbers (MySQL round-trip)', () => {
    expect(valuesEqual('10.00', 10)).toBe(true);
    expect(valuesEqual('10.01', 10)).toBe(false);
  });

  it('compares Date to ISO string', () => {
    const d = new Date('2024-01-02T03:04:05Z');
    expect(valuesEqual(d, '2024-01-02T03:04:05Z')).toBe(true);
  });

  it('compares tinyint booleans', () => {
    expect(valuesEqual(true, 1)).toBe(true);
    expect(valuesEqual(false, 0)).toBe(true);
    expect(valuesEqual(true, 0)).toBe(false);
  });

  it('falls back to string equality', () => {
    expect(valuesEqual('abc', 'abc')).toBe(true);
    expect(valuesEqual('abc', 'abd')).toBe(false);
  });
});

const rule: MapRule = {
  kind: 'map',
  source: 'tblCustomers',
  target: 'customers',
  idMap: { legacyKey: 'CustomerID', newKey: 'deterministic' },
  fields: [
    { from: 'CustomerID', to: 'legacy_id', verify: 'exact' },
    { from: 'FullName', to: 'name', verify: 'exact' },
    {
      from: 'Email',
      to: 'email',
      transform: (v) => String(v ?? '').toLowerCase().trim(),
    },
    { from: 'Notes', to: 'notes', verify: 'ignore' },
    { from: 'Balance', to: 'balance', verify: { tolerance: 0.01 } },
  ],
};

describe('compareRow', () => {
  const legacy = {
    CustomerID: 1,
    FullName: 'Ada',
    Email: '  ADA@X.COM ',
    Notes: 'whatever',
    Balance: 100.0,
  };

  it('returns ok when the migrated row matches (transform re-applied)', () => {
    const migrated = {
      legacy_id: 1,
      name: 'Ada',
      email: 'ada@x.com', // transform applied at import; differ re-applies
      notes: 'DIFFERENT — but ignored',
      balance: '100.004', // within tolerance
    };
    expect(compareRow(rule, legacy, migrated)).toEqual({
      legacyPk: '1',
      status: 'ok',
    });
  });

  it('flags missing when there is no migrated row', () => {
    expect(compareRow(rule, legacy, null)).toEqual({
      legacyPk: '1',
      status: 'missing',
    });
  });

  it('flags a mismatch and reports the transformed expected value', () => {
    const migrated = {
      legacy_id: 1,
      name: 'Adam', // wrong
      email: 'ada@x.com',
      notes: 'x',
      balance: 100,
    };
    const res = compareRow(rule, legacy, migrated);
    expect(res.status).toBe('mismatch');
    if (res.status === 'mismatch') {
      expect(res.fields).toEqual([
        { field: 'name', legacy: 'Ada', migrated: 'Adam' },
      ]);
    }
  });

  it('flags out-of-tolerance numeric drift', () => {
    const migrated = {
      legacy_id: 1,
      name: 'Ada',
      email: 'ada@x.com',
      notes: 'x',
      balance: 100.5, // outside 0.01
    };
    const res = compareRow(rule, legacy, migrated);
    expect(res.status).toBe('mismatch');
    if (res.status === 'mismatch') {
      expect(res.fields.map((f) => f.field)).toEqual(['balance']);
    }
  });
});
