import { describe, it, expect } from 'vitest';
import { RULES, ruleOrder, ruleBySource, allLegacyTables } from '../src/rules/_registry.js';

const LEGACY_47 = 'Logs arqueo_cajas ciudades clientes clientes_agrup1 clientes_tipodoc clientes_tiporeg config_plemsi customers departamentos documentos e_invoice_response empresas empresas_resoluciones encabezados encabezados_costos encabezados_mov encabezados_pagodet formaspago inventarios inventarios_abc inventarios_agrup1 inventarios_clasifimpto inventarios_formulas inventarios_kardex inventarios_listas inventarios_precios inventarios_tipos inventarios_unidades inventarios_unidades_tipos monedas order_items orders paises payloads prefijos products puntos puntosmov roles userclaims userlogins userroles users usuario_systemconfig usuarios usuariostipo'.split(' ');

describe('rule registry', () => {
  it('covers every one of the 47 legacy tables (map or skip)', () => {
    for (const t of LEGACY_47) expect(ruleBySource.has(t), `missing rule for ${t}`).toBe(true);
    expect(new Set(allLegacyTables).size).toBe(allLegacyTables.length); // no dupes
  });
  it('orders parents before children', () => {
    const o = ruleOrder().map((r) => r.source);
    expect(o.indexOf('empresas')).toBeLessThan(o.indexOf('clientes'));
    expect(o.indexOf('clientes')).toBeLessThan(o.indexOf('encabezados'));
    expect(o.indexOf('encabezados')).toBeLessThan(o.indexOf('encabezados_mov'));
    expect(o.indexOf('inventarios')).toBeLessThan(o.indexOf('encabezados_mov'));
  });
  it('maps target only authoritative new tables', () => {
    const valid = new Set(['companies', 'customers', 'products', 'orders', 'order_items', 'payments', 'users']);
    for (const r of RULES) if (r.kind === 'map') expect(valid.has(r.target)).toBe(true);
  });
});
