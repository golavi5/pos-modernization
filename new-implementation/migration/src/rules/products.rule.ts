import type { Rule } from '../types/Rule.js';
export default {
  kind: 'map', source: 'inventarios', target: 'products', dependsOn: ['empresas'],
  idMap: { legacyKey: 'IdInventario', newKey: 'deterministic' },
  fields: [
    { from: null,            to: 'company_id',    transform: (_v, c) => c.companyId },
    { from: null,            to: 'created_by',    transform: (_v, c) => c.bootstrapUserId },
    { from: 'NomInventario', to: 'name',          verify: 'exact' },
    { from: 'CodInventario', to: 'sku',           verify: 'exact' },
    { from: 'CodigoBarras',  to: 'barcode',       transform: (v) => v || null },
    { from: 'CostoPromedio', to: 'cost',          verify: { tolerance: 0.01 } },
    { from: 'CantFisica',    to: 'stock_quantity', transform: (v) => Math.trunc(Number(v)), verify: 'exact' },
    { from: 'Iva',           to: 'tax_rate',      transform: (v) => Number(v), verify: { tolerance: 0.01 } },
    // price: lowest IdLista entry from inventarios_precios for this IdInventario
    { from: 'IdInventario',  to: 'price',         verify: { tolerance: 0.01 },
      transform: (v, c) => { const p = c.lookups.inventarios_precios?.get(String(v)); return p ? Number(p.Precio) : 0; } },
    { from: 'EsActivo',      to: 'is_active',     transform: (v) => !!Number(v), verify: 'ignore' },
  ],
} satisfies Rule;
