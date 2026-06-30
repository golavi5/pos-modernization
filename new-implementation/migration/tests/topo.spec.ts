import { describe, it, expect } from 'vitest';
import { topoSort } from '../src/core/topo.js';

describe('topoSort', () => {
  it('orders dependencies first', () => {
    const o = topoSort(['encabezados_pagodet', 'encabezados', 'clientes'],
      { encabezados_pagodet: ['encabezados'], encabezados: ['clientes'], clientes: [] });
    expect(o.indexOf('clientes')).toBeLessThan(o.indexOf('encabezados'));
    expect(o.indexOf('encabezados')).toBeLessThan(o.indexOf('encabezados_pagodet'));
  });
  it('throws naming the cycle', () => {
    expect(() => topoSort(['a', 'b'], { a: ['b'], b: ['a'] })).toThrow(/cycle/i);
  });
});
