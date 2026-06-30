import type { Rule } from '../types/Rule.js';
import { deterministicId } from '../core/idMap.js';
export default {
  kind: 'map', source: 'encabezados_mov', target: 'order_items', dependsOn: ['encabezados', 'inventarios'],
  // 1.18M legacy lines; tolerate the rare source orphan (a line referencing a
  // deleted product/order) rather than failing the whole table — reported, not silent.
  maxRowErrors: 2000,
  idMap: { legacyKey: 'IdEncabMov', newKey: 'deterministic' },
  fields: [
    { from: 'IdEncab',       to: 'order_id',   transform: (v) => deterministicId('encabezados', String(v)) },
    { from: 'IdInventario',  to: 'product_id', transform: (v) => deterministicId('inventarios', String(v)) },
    { from: 'Cant',          to: 'quantity',   verify: 'exact',
      transform: (v) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) && Math.abs(n) <= 2147483647 ? n : 0; } },
    { from: 'ValorUnit',     to: 'unit_price', verify: { tolerance: 0.01 } },
    { from: 'ValorSubTotal', to: 'subtotal',   verify: { tolerance: 0.01 } },
    { from: 'ValorIva',      to: 'tax_amount', verify: { tolerance: 0.01 } },
    { from: 'ValorTotal',    to: 'total',      verify: { tolerance: 0.01 } },
  ],
} satisfies Rule;
