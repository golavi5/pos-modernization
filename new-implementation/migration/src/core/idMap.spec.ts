import { describe, it, expect } from 'vitest';
import { deterministicId, resolveId } from './idMap.js';

describe('deterministicId', () => {
  it('is stable for the same source + legacy id', () => {
    const a = deterministicId('tblCustomers', 42);
    const b = deterministicId('tblCustomers', 42);
    expect(a).toBe(b);
  });

  it('coerces numeric and string legacy ids to the same value', () => {
    expect(deterministicId('tblCustomers', 42)).toBe(
      deterministicId('tblCustomers', '42'),
    );
  });

  it('differs by legacy id', () => {
    expect(deterministicId('tblCustomers', 1)).not.toBe(
      deterministicId('tblCustomers', 2),
    );
  });

  it('differs by source table (namespacing across tables)', () => {
    expect(deterministicId('tblCustomers', 1)).not.toBe(
      deterministicId('tblProducts', 1),
    );
  });

  it('produces a valid v5 uuid', () => {
    expect(deterministicId('tblCustomers', 1)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('resolveId', () => {
  it('uses the legacyKey column for deterministic ids', () => {
    const id = resolveId(
      { legacyKey: 'CustomerID', newKey: 'deterministic' },
      'tblCustomers',
      { CustomerID: 7, FullName: 'x' },
    );
    expect(id).toBe(deterministicId('tblCustomers', 7));
  });

  it('returns a random uuid for uuid-v4', () => {
    const opts = { legacyKey: 'CustomerID', newKey: 'uuid-v4' as const };
    const a = resolveId(opts, 'tblCustomers', { CustomerID: 7 });
    const b = resolveId(opts, 'tblCustomers', { CustomerID: 7 });
    expect(a).not.toBe(b);
  });
});
