import { describe, it, expect } from 'vitest';
import { deterministicId, newId } from '../src/core/idMap.js';

describe('idMap', () => {
  it('is stable across calls', () => {
    expect(deterministicId('clientes', '42')).toBe(deterministicId('clientes', '42'));
  });
  it('differs by source and pk', () => {
    expect(deterministicId('clientes', '42')).not.toBe(deterministicId('inventarios', '42'));
    expect(deterministicId('clientes', '42')).not.toBe(deterministicId('clientes', '43'));
  });
  it('numeric and string pk collapse', () => {
    expect(deterministicId('t', 7)).toBe(deterministicId('t', '7'));
  });
  it('uuid-v4 is valid and non-deterministic', () => {
    const a = newId({ legacyKey: 'id', newKey: 'uuid-v4' }, 't', '1');
    const b = newId({ legacyKey: 'id', newKey: 'uuid-v4' }, 't', '1');
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });
});
