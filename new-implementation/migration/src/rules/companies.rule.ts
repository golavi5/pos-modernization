import type { Rule } from '../types/Rule.js';
export default {
  kind: 'map', source: 'empresas', target: 'companies',
  idMap: { legacyKey: 'IdEmpresa', newKey: 'deterministic' },
  fields: [
    { from: 'Nombre',    to: 'name',      verify: 'exact' },
    { from: 'Nit',       to: 'tax_id',    verify: 'exact' },
    { from: 'Direccion', to: 'address',   verify: 'exact' },
    { from: 'Telefono',  to: 'phone',     verify: 'exact' },
    { from: 'Email',     to: 'email',     transform: (v) => String(v ?? '').toLowerCase().trim() || null },
    { from: 'EsActivo',  to: 'is_active', transform: (v) => !!Number(v), verify: 'ignore' },
  ],
} satisfies Rule;
