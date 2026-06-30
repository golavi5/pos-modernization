import type { MapRule } from '../types/Rule.js';
import type { FieldMismatch, RowResult } from '../types/Report.js';

/**
 * Field-by-field comparison for `verify`.
 *
 * Key semantic: a migrated field is the result of applying the rule's
 * `transform` to the legacy value at import time. So we re-apply the same
 * transform to the legacy value and compare *that* against what landed in the
 * target. Comparing the raw legacy value would false-mismatch every transformed
 * field (lowercased emails, parsed dates, …).
 *
 * CAVEAT: because both sides run the SAME transform, this proves row presence +
 * DB round-trip fidelity, NOT transform-logic correctness — a buggy transform
 * passes here silently. Transform correctness is owned by the rule unit tests
 * (`*.rule.spec.ts`), which assert expected outputs against hand-written inputs.
 */

/**
 * Normalized equality that tolerates the type drift of a MySQL round-trip:
 * DECIMAL → string, DATETIME → Date, etc. NOT used for `tolerance` mode.
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  if (a instanceof Date || b instanceof Date) {
    const ta = a instanceof Date ? a.getTime() : new Date(a as string).getTime();
    const tb = b instanceof Date ? b.getTime() : new Date(b as string).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return String(a) === String(b);
    return ta === tb;
  }

  if (typeof a === 'boolean' || typeof b === 'boolean') {
    // MySQL stores booleans as 0/1 tinyint.
    return Number(a) === Number(b);
  }

  const na = typeof a === 'number' ? a : Number(a);
  const nb = typeof b === 'number' ? b : Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== '' && b !== '') {
    return na === nb;
  }

  return String(a) === String(b);
}

function withinTolerance(a: unknown, b: unknown, tolerance: number): boolean {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return false;
  return Math.abs(na - nb) <= tolerance;
}

/**
 * Compare one legacy row against its migrated counterpart.
 * `migrated` is null when the join found no target row (→ 'missing').
 */
export function compareRow(
  rule: MapRule,
  legacy: Record<string, unknown>,
  migrated: Record<string, unknown> | null,
): RowResult {
  const legacyPk = String(legacy[rule.idMap.legacyKey]);

  if (migrated == null) return { legacyPk, status: 'missing' };

  const mismatches: FieldMismatch[] = [];

  for (const field of rule.fields) {
    const mode = field.verify ?? 'exact';
    if (mode === 'ignore') continue;

    const expected = field.transform
      ? field.transform(legacy[field.from], { row: legacy, rule })
      : legacy[field.from];
    const actual = migrated[field.to];

    const equal =
      typeof mode === 'object'
        ? withinTolerance(expected, actual, mode.tolerance)
        : valuesEqual(expected, actual);

    if (!equal) {
      mismatches.push({ field: field.to, legacy: expected, migrated: actual });
    }
  }

  if (mismatches.length > 0) {
    return { legacyPk, status: 'mismatch', fields: mismatches };
  }
  return { legacyPk, status: 'ok' };
}
