import type { Rule } from '../types/Rule.js';
import { deterministicId } from '../core/idMap.js';
export default {
  kind: 'map', source: 'encabezados_mov', target: 'order_items', dependsOn: ['encabezados', 'inventarios'],
  idMap: { legacyKey: 'IdEncabMov', newKey: 'deterministic' },
  fields: [
    { from: 'IdEncab',       to: 'order_id',   transform: (v) => deterministicId('encabezados', String(v)) },
    { from: 'IdInventario',  to: 'product_id', transform: (v) => deterministicId('inventarios', String(v)) },
    { from: 'Cant',          to: 'quantity',   transform: (v) => Math.trunc(Number(v)), verify: 'exact' },
    { from: 'ValorUnit',     to: 'unit_price', verify: { tolerance: 0.01 } },
    { from: 'ValorSubTotal', to: 'subtotal',   verify: { tolerance: 0.01 } },
    { from: 'ValorIva',      to: 'tax_amount', verify: { tolerance: 0.01 } },
    { from: 'ValorTotal',    to: 'total',      verify: { tolerance: 0.01 } },
  ],
} satisfies Rule;
