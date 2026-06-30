/**
 * Reusable field transforms for rule files. Each throws on un-coercible input
 * so the import path turns it into a RowError (collected, not fatal).
 */

/** Lowercase + trim a string-ish value; null/undefined → null. */
export function lowerTrim(v: unknown): string | null {
  if (v == null) return null;
  return String(v).toLowerCase().trim();
}

/** Trim a string-ish value; null/undefined → null. */
export function trimStr(v: unknown): string | null {
  if (v == null) return null;
  return String(v).trim();
}

/** Coerce a 0/1/"true"/"false"/null legacy flag to a tinyint 0|1. */
export function toBit(v: unknown): 0 | 1 {
  if (v === true || v === 1 || v === '1') return 1;
  if (typeof v === 'string' && v.trim().toLowerCase() === 'true') return 1;
  return 0;
}

/**
 * Parse a legacy .NET / SQL date into a JS Date.
 * Accepts: Date, epoch millis, ISO/SQL strings, and .NET "/Date(1234567890)/".
 * Throws on un-parseable non-null input (→ RowError). null/'' → null.
 */
export function parseDotNetDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v;

  if (typeof v === 'number') return new Date(v);

  const s = String(v).trim();

  const dotNet = s.match(/\/Date\((-?\d+)\)\//);
  if (dotNet) return new Date(Number(dotNet[1]));

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`parseDotNetDate: un-parseable date ${JSON.stringify(v)}`);
  }
  return d;
}

/** Map a legacy soft-delete flag to a deleted_at timestamp (or null). */
export function deletedFlagToTimestamp(v: unknown, now: Date = new Date()): Date | null {
  return toBit(v) ? now : null;
}
