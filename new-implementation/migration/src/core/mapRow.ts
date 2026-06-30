import { resolveId } from './idMap.js';
import type { MapRule } from '../types/Rule.js';
import type { RowError } from '../types/Report.js';

export type MappedRow = {
  /** Resolved target PK (uuid). */
  id: string;
  /** Column → value map ready for INSERT (includes `id`). */
  target: Record<string, unknown>;
  /** Per-field transform failures for this row. */
  errors: RowError[];
};

/**
 * Apply a rule's `fields` to one legacy row, producing the target row.
 * Transform failures are collected per-field (not thrown) so one bad row never
 * aborts a whole table — the import runner decides what to do with them.
 */
export function buildTargetRow(
  rule: MapRule,
  legacy: Record<string, unknown>,
): MappedRow {
  const id = resolveId(rule.idMap, rule.source, legacy);
  const legacyPk = String(legacy[rule.idMap.legacyKey]);
  const target: Record<string, unknown> = { id };
  const errors: RowError[] = [];

  for (const field of rule.fields) {
    try {
      target[field.to] = field.transform
        ? field.transform(legacy[field.from], { row: legacy, rule })
        : legacy[field.from];
    } catch (e) {
      errors.push({
        rule: rule.source,
        legacyPk,
        field: field.to,
        cause: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { id, target, errors };
}
