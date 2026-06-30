import { describe, it, expect } from 'vitest';
import { topoSortRules } from './topo.js';
import type { Rule } from '../types/Rule.js';

const map = (source: string, dependsOn?: string[]): Rule => ({
  kind: 'map',
  source,
  target: source,
  idMap: { legacyKey: 'id', newKey: 'deterministic' },
  fields: [],
  dependsOn,
});

describe('topoSortRules', () => {
  it('orders dependencies before dependents', () => {
    const order = topoSortRules([
      map('payments', ['orders']),
      map('orders', ['customers']),
      map('customers'),
    ]).map((r) => r.source);
    expect(order.indexOf('customers')).toBeLessThan(order.indexOf('orders'));
    expect(order.indexOf('orders')).toBeLessThan(order.indexOf('payments'));
  });

  it('throws on an unknown dependency', () => {
    expect(() => topoSortRules([map('orders', ['ghosts'])])).toThrow(
      /unknown source "ghosts"/,
    );
  });

  it('throws on a cycle with the path', () => {
    expect(() =>
      topoSortRules([map('a', ['b']), map('b', ['a'])]),
    ).toThrow(/cycle/i);
  });

  it('throws on duplicate source rules', () => {
    expect(() => topoSortRules([map('a'), map('a')])).toThrow(/Duplicate/);
  });
});
