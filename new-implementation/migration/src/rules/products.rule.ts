import type { Rule } from '../types/Rule.js';

// Legacy decimal(28,6) columns hold a few corrupt rows (barcodes mis-entered into
// CantFisica/CostoPromedio, junk Iva) that overflow the new tighter types. Clamp
// OUT-OF-RANGE garbage to 0 while preserving every valid in-range value (incl.
// negative stock); verify recomputes the same clamp, so parity holds and the
// product — and its sales history — still migrate.
const clampNum = (v: unknown, min: number, max: number, int = false): number => {
  let n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (int) n = Math.trunc(n);
  return n < min || n > max ? 0 : n;
};

export default {
  kind: 'map', source: 'inventarios', target: 'products', dependsOn: ['empresas'],
  // A handful of legacy rows carry corrupt numerics (barcodes mis-entered into
  // CantFisica/CostoPromedio, junk Iva) that overflow the new tighter column
  // types. Tolerate + report them rather than failing the whole 30k-row table.
  maxRowErrors: 50,
  idMap: { legacyKey: 'IdInventario', newKey: 'deterministic' },
  fields: [
    { from: null,            to: 'company_id',    transform: (_v, c) => c.companyId },
    { from: null,            to: 'created_by',    transform: (_v, c) => c.bootstrapUserId },
    { from: 'NomInventario', to: 'name',          verify: 'exact' },
    { from: 'CodInventario', to: 'sku',           verify: 'exact' },
    // barcode is UNIQUE; null out empties AND non-unique duplicates (53 dup barcodes in
    // the real dump) so every product migrates without colliding on the unique index.
    { from: 'CodigoBarras',  to: 'barcode',       transform: (v, c) => {
      const b = String(v ?? '').trim();
      return b && !c.lookups.inventariosDupBarcodes?.has(b) ? b : null;
    } },
    { from: 'CostoPromedio', to: 'cost',          verify: { tolerance: 0.01 },
      transform: (v) => clampNum(v, 0, 99999999.99) },
    { from: 'CantFisica',    to: 'stock_quantity', verify: 'exact',
      transform: (v) => clampNum(v, -2147483648, 2147483647, true) },
    { from: 'Iva',           to: 'tax_rate',      verify: { tolerance: 0.01 },
      transform: (v) => clampNum(v, 0, 999.99) },
    // price: lowest IdLista entry from inventarios_precios for this IdInventario
    { from: 'IdInventario',  to: 'price',         verify: { tolerance: 0.01 },
      transform: (v, c) => clampNum(c.lookups.inventarios_precios?.get(String(v))?.Precio, 0, 99999999.99) },
    { from: 'EsActivo',      to: 'is_active',     transform: (v) => !!Number(v), verify: 'ignore' },
  ],
} satisfies Rule;
