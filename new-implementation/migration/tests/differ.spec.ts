import { describe, it, expect } from 'vitest';
import { compare } from '../src/core/differ.js';
import type { FieldMap } from '../src/types/Rule.js';

const fields: FieldMap[] = [
  { from: 'Name', to: 'name', verify: 'exact' },
  { from: 'Price', to: 'price', verify: { tolerance: 0.01 } },
  { from: 'X', to: 'updated_at', verify: 'ignore' },
];

describe('differ.compare', () => {
  it('missing when migrated row is null', () => {
    expect(compare('1', { name: 'x', price: 1, updated_at: 'a' }, null, fields)).toEqual({ status: 'missing', legacyPk: '1' });
  });
  it('ok when compared fields match', () => {
    expect(compare('1', { name: 'Ana', price: 10, updated_at: 'a' },
                        { name: 'Ana', price: 10, updated_at: 'b' }, fields).status).toBe('ok');
  });
  it('flags exact mismatch, respects tolerance + ignore', () => {
    const r = compare('1', { name: 'Ana', price: 10.005, updated_at: 'a' },
                            { name: 'Bob', price: 10.00, updated_at: 'zzz' }, fields);
    expect(r.status).toBe('mismatch');
    if (r.status === 'mismatch') expect(r.fields.map((f) => f.field)).toEqual(['name']);
  });
});
