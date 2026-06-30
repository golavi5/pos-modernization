import type { FieldMap } from '../types/Rule.js';
import type { RowResult, Mismatch } from '../types/Report.js';

function norm(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v === null || v === undefined) return null;
  return v;
}

export function compare(
  legacyPk: string,
  expected: Record<string, unknown>,
  migrated: Record<string, unknown> | null,
  fields: FieldMap[],
): RowResult {
  if (migrated === null) return { status: 'missing', legacyPk };
  const mismatches: Mismatch[] = [];
  for (const f of fields) {
    const mode = f.verify ?? 'exact';
    if (mode === 'ignore' || f.to === 'legacy_id') continue;
    const e = norm(expected[f.to]); const a = norm(migrated[f.to]);
    if (typeof mode === 'object' && 'tolerance' in mode) {
      if (Math.abs(Number(e) - Number(a)) > mode.tolerance) mismatches.push({ field: f.to, legacy: e, migrated: a });
    } else if (String(e) !== String(a)) {
      mismatches.push({ field: f.to, legacy: e, migrated: a });
    }
  }
  return mismatches.length ? { status: 'mismatch', legacyPk, fields: mismatches } : { status: 'ok', legacyPk };
}
