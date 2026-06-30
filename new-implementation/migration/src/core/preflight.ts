/**
 * Infrastructure pre-checks that run BEFORE any transaction opens. A failure
 * here is an exit-code-2 halt (design §7.1) — the dump and rules are
 * inconsistent and continuing would silently skip data.
 */

/**
 * Every legacy table must be acknowledged by exactly one rule (map / skip /
 * archive). A legacy table with no rule halts the run — forces a deliberate
 * decision rather than silently dropping it. Returns the offending tables.
 */
export function unknownTables(
  legacyTables: string[],
  ruleSources: string[],
): string[] {
  const known = new Set(ruleSources);
  return legacyTables.filter((t) => !known.has(t));
}

export function assertNoUnknownTables(
  legacyTables: string[],
  ruleSources: string[],
): void {
  const unknown = unknownTables(legacyTables, ruleSources);
  if (unknown.length > 0) {
    throw new Error(
      `Legacy dump has ${unknown.length} table(s) with no rule: ` +
        `${unknown.join(', ')}. Add a map/skip/archive rule for each.`,
    );
  }
}
