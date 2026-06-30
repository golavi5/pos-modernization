/**
 * Rule contract — the single source read by both `import` and `verify`.
 * One legacy table maps to exactly one rule.
 *
 * See docs/superpowers/specs/2026-05-21-m4-legacy-migration-design.md §5.
 */

/** How the differ treats a field during `verify`. */
export type VerifyMode = 'exact' | 'ignore' | { tolerance: number };

export type TransformCtx = {
  /** The full legacy row, for cross-field transforms. */
  row: Record<string, unknown>;
  /** The rule being applied. */
  rule: Rule;
};

export type FieldMap = {
  /** Legacy column name. */
  from: string;
  /** New (target) column name. */
  to: string;
  /** Optional value transform. Throwing produces a per-row RowError. */
  transform?: (value: unknown, ctx: TransformCtx) => unknown;
  /** Diff mode for `verify`. Defaults to 'exact' when omitted. */
  verify?: VerifyMode;
};

export type IdMap = {
  /** Legacy PK column. */
  legacyKey: string;
  /**
   * `deterministic` = uuidv5(NAMESPACE, `${source}:${legacy_id}`) — idempotent
   * re-imports. `uuid-v4` = random (non-idempotent; rarely what you want).
   */
  newKey: 'uuid-v4' | 'deterministic';
};

/** Map a legacy table into a target table, field by field. */
export type MapRule = {
  kind: 'map';
  source: string;
  target: string;
  fields: FieldMap[];
  idMap: IdMap;
  /** Rules that must succeed before this one runs (topological order). */
  dependsOn?: string[];
  /**
   * Max per-row errors tolerated before the table's transaction is rolled
   * back and the rule marked `failed`. Default 0 (any row error fails it).
   */
  maxRowErrors?: number;
};

/** Deliberately ignore a legacy table (acknowledged, not imported). */
export type SkipRule = {
  kind: 'skip';
  source: string;
  reason: string;
};

/** Copy a legacy table verbatim into migration_archive as raw JSON. */
export type ArchiveRule = {
  kind: 'archive';
  source: string;
  targetTable: string;
};

export type Rule = MapRule | SkipRule | ArchiveRule;

/** Type guards. */
export const isMapRule = (r: Rule): r is MapRule => r.kind === 'map';
export const isSkipRule = (r: Rule): r is SkipRule => r.kind === 'skip';
export const isArchiveRule = (r: Rule): r is ArchiveRule => r.kind === 'archive';

/** Fixed namespace for deterministic UUIDv5. Do not change — it would
 * re-key every migrated row. Generated once for this project. */
export const MIGRATION_UUID_NAMESPACE = '6f4d8b1e-2c3a-5f7d-9e1b-0a2c4d6e8f10';
