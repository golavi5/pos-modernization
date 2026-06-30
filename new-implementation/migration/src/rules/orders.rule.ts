import type { Rule } from '../types/Rule.js';
import { deterministicId } from '../core/idMap.js';
import { parseLegacyDate } from '../core/transforms.js';
export default {
  kind: 'map', source: 'encabezados', target: 'orders', dependsOn: ['clientes', 'usuarios'],
  idMap: { legacyKey: 'IdEncab', newKey: 'deterministic' },
  fields: [
    { from: null,           to: 'company_id',   transform: (_v, c) => c.companyId },
    { from: 'IdUsuario',    to: 'created_by',   transform: (v) => deterministicId('usuarios', String(v)) },
    { from: 'IdCliente',    to: 'customer_id',  transform: (v) => v == null ? null : deterministicId('clientes', String(v)) },
    { from: 'NumDocumento', to: 'order_number', transform: (v) => String(v) },
    { from: 'Fecha',        to: 'order_date',   transform: parseLegacyDate },
    { from: 'EsAnulado',    to: 'status',       transform: (v) => Number(v) ? 'cancelled' : 'completed' },
    // subtotal/tax/total derived from the order's lines (ctx.lookups.mov_totals keyed by IdEncab)
    { from: 'IdEncab',      to: 'subtotal',     verify: { tolerance: 0.01 },
      transform: (v, c) => Number(c.lookups.mov_totals?.get(String(v))?.subtotal ?? 0) },
    { from: 'IdEncab',      to: 'tax_amount',   verify: { tolerance: 0.01 },
      transform: (v, c) => Number(c.lookups.mov_totals?.get(String(v))?.tax ?? 0) },
    { from: 'IdEncab',      to: 'total_amount', verify: { tolerance: 0.01 },
      transform: (v, c) => Number(c.lookups.mov_totals?.get(String(v))?.total ?? 0) },
  ],
} satisfies Rule;
