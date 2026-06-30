import type { Rule } from '../types/Rule.js';
import { deterministicId } from '../core/idMap.js';
import { parseLegacyDate } from '../core/transforms.js';
export default {
  kind: 'map', source: 'encabezados', target: 'orders', dependsOn: ['clientes', 'usuarios'],
  idMap: { legacyKey: 'IdEncab', newKey: 'deterministic' },
  fields: [
    { from: null,           to: 'company_id',   transform: (_v, c) => c.companyId },
    // created_by is NOT NULL + FK→users; a null/absent legacy user falls back to the bootstrap
    // user so the order still imports (mirrors the customer_id null-guard below).
    { from: 'IdUsuario',    to: 'created_by',   transform: (v, c) => v == null ? c.bootstrapUserId : deterministicId('usuarios', String(v)) },
    { from: 'IdCliente',    to: 'customer_id',  transform: (v) => v == null ? null : deterministicId('clientes', String(v)) },
    // Legacy NumDocumento repeats across prefixes/resolutions/years (6,617 dups in the
    // real dump; not even (IdEmpresa,IdDocumento,NumDocumento) is unique). order_number is
    // globally UNIQUE, so disambiguate with the unique legacy PK to avoid upsert collisions.
    { from: 'NumDocumento', to: 'order_number', transform: (v, c) => `${v}-${c.row.IdEncab}` },
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
