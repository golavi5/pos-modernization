import type { SkipRule } from '../types/Rule.js';

const fiscal = [
  'config_plemsi', 'e_invoice_response', 'empresas_resoluciones', 'prefijos',
  'documentos', 'payloads', 'clientes_tipodoc', 'clientes_tiporeg',
];

const reference = [
  'formaspago', 'ciudades', 'departamentos', 'paises', 'monedas',
  'inventarios_abc', 'inventarios_agrup1', 'inventarios_clasifimpto',
  'inventarios_formulas', 'inventarios_kardex', 'inventarios_listas',
  'inventarios_precios', 'inventarios_tipos', 'inventarios_unidades',
  'inventarios_unidades_tipos', 'clientes_agrup1', 'usuariostipo',
  'usuario_systemconfig', 'puntos', 'puntosmov', 'arqueo_cajas',
  'encabezados_costos', 'Logs',
];

// New-app / ASP.NET Identity tables present in the dump; not legacy sources.
const newApp = [
  'customers', 'orders', 'order_items', 'products', 'users',
  'roles', 'userclaims', 'userlogins', 'userroles',
];

export const SKIPS: SkipRule[] = [
  ...fiscal.map((s): SkipRule => ({
    kind: 'skip', source: s, category: 'fiscal-M5',
    reason: 'DIAN fiscal subsystem — deferred to M5.',
  })),
  ...reference.map((s): SkipRule => ({
    kind: 'skip', source: s, category: 'reference',
    reason: 'Catalog/reference table with no new-schema target (lookups consumed inline during map).',
  })),
  ...newApp.map((s): SkipRule => ({
    kind: 'skip', source: s, category: 'new-app-table',
    reason: 'New-app / ASP.NET Identity table present in the dump; not a legacy source.',
  })),
];
