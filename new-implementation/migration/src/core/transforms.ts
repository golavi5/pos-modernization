import type { TransformCtx } from '../types/Rule.js';

const SENTINELS = new Set(['1000-01-01 00:00:00', '0000-00-00 00:00:00']);

export function parseLegacyDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  if (SENTINELS.has(s)) return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s) ? s.replace(' ', 'T') + 'Z' : s;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`unparseable date: ${JSON.stringify(v)}`);
  return d;
}

export function fullName(row: Record<string, unknown>): string {
  const parts = ['Nombre1', 'Nombre2', 'Apellido1', 'Apellido2']
    .map((k) => String(row[k] ?? '').trim()).filter(Boolean);
  const person = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (person) return person;
  const razon = String(row['RazonSocial'] ?? '').trim();
  return razon || 'Sin nombre';
}

// IdFormaPago → PaymentMethod enum. The lookup map is built from the legacy
// formaspago table (Task 8 loads it). Heuristic by name; unknown → 'other'.
export function mapPaymentMethod(idFormaPago: unknown, ctx: TransformCtx): string {
  const row = ctx.lookups.formaspago?.get(String(idFormaPago));
  const name = String(row?.NomFormaPago ?? '').toLowerCase();
  if (/efectivo|cash/.test(name)) return 'cash';
  if (/tarjeta|card|credito|debito/.test(name)) return 'card';
  if (/transfer|consign|nequi|daviplata|pse/.test(name)) return 'transfer';
  return 'other';
}
