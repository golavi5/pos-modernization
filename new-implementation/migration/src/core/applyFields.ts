import type { MapRule, TransformCtx } from '../types/Rule.js';
import type { RowError } from '../types/Report.js';

export function applyFields(
  rule: MapRule, row: Record<string, unknown>, newId: string, ctx: TransformCtx,
): { target: Record<string, unknown>; errors: RowError[] } {
  const errors: RowError[] = [];
  const legacyPk = String(row[rule.idMap.legacyKey]);
  const target: Record<string, unknown> = { id: newId, legacy_id: legacyPk };

  for (const f of rule.fields) {
    if (f.to === 'legacy_id') continue;
    const raw = f.from == null ? null : row[f.from];
    try {
      target[f.to] = f.transform ? f.transform(raw, ctx) : raw;
    } catch (e) {
      errors.push({ rule: rule.source, legacyPk, field: f.to, cause: e instanceof Error ? e.message : String(e) });
    }
  }
  return { target, errors };
}
