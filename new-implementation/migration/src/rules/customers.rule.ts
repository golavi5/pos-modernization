import type { Rule } from '../types/Rule.js';
import { fullName, parseLegacyDate } from '../core/transforms.js';
export default {
  kind: 'map', source: 'clientes', target: 'customers', dependsOn: ['empresas'],
  idMap: { legacyKey: 'IdCliente', newKey: 'deterministic' },
  fields: [
    { from: null,          to: 'company_id', transform: (_v, c) => c.companyId },
    { from: null,          to: 'name',       transform: (_v, c) => fullName(c.row) },
    // Legacy Email is nullable; synthesise deterministic fallback to satisfy NOT NULL + UNIQUE.
    { from: 'Email',       to: 'email',      transform: (v, c) => String(v ?? '').toLowerCase().trim() || `cliente-${c.row.IdCliente}@migrated.local` },
    { from: 'Telefono',    to: 'phone',      verify: 'exact' },
    { from: 'Direccion',   to: 'address',    verify: 'exact' },
    { from: 'EsActivo',    to: 'deleted_at', transform: (v) => Number(v) ? null : new Date(), verify: 'ignore' },
    { from: 'FechaCreacion', to: 'created_at', transform: parseLegacyDate, verify: 'ignore' },
  ],
} satisfies Rule;
