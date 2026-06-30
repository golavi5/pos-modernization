import type { Rule } from '../types/Rule.js';
import { deterministicId } from '../core/idMap.js';
import { parseLegacyDate, mapPaymentMethod } from '../core/transforms.js';
// NOTE: mapPaymentMethod uses NomFormaPago name-heuristics (cash/card/transfer/other).
// Exact formaspago values from bd_ex.sql are verified against real data during the
// migration runbook (Task 9 pre-flight). Unknown ids fall through to 'other' safely.
export default {
  kind: 'map', source: 'encabezados_pagodet', target: 'payments', dependsOn: ['encabezados'],
  idMap: { legacyKey: 'IdPago', newKey: 'deterministic' },
  fields: [
    { from: 'IdEncab',     to: 'order_id',       transform: (v) => deterministicId('encabezados', String(v)) },
    { from: 'ValorPago',   to: 'amount',         verify: { tolerance: 0.01 } },
    { from: 'FechaPago',   to: 'payment_date',   transform: parseLegacyDate },
    { from: 'IdFormaPago', to: 'payment_method', transform: (v, c) => mapPaymentMethod(v, c) },
  ],
} satisfies Rule;
