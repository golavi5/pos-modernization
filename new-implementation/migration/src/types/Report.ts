/**
 * Report contract — the structured output of `import` and `verify`.
 * Serialized to reports/<ts>/report.json; rendered to report.html.
 *
 * See docs/superpowers/specs/2026-05-21-m4-legacy-migration-design.md §6, §7.
 */

export type RuleStatus =
  | 'passed'
  | 'partial' // committed, but some rows errored (≤ maxRowErrors)
  | 'failed' // rolled back (row errors > maxRowErrors, or a hard error)
  | 'skipped' // kind=skip
  | 'blocked_by_dependency'; // a dependsOn rule failed

/** One row that could not be transformed/inserted during import. */
export type RowError = {
  rule: string; // source table
  legacyPk: string;
  field?: string;
  cause: string;
};

/** Per-field mismatch found during verify. */
export type FieldMismatch = {
  field: string;
  legacy: unknown;
  migrated: unknown;
};

/** The verify-time classification of a single legacy row. */
export type RowResult =
  | { legacyPk: string; status: 'ok' }
  | { legacyPk: string; status: 'missing' }
  | { legacyPk: string; status: 'mismatch'; fields: FieldMismatch[] };

export type ImportRuleReport = {
  source: string;
  target?: string;
  kind: 'map' | 'skip' | 'archive';
  status: RuleStatus;
  rowsRead: number;
  rowsWritten: number;
  rowErrors: RowError[];
};

export type VerifyRuleReport = {
  source: string;
  target: string;
  status: RuleStatus;
  rowsCompared: number;
  ok: number;
  missing: number;
  mismatched: number;
  /** Capped sample of non-ok rows for the HTML report. */
  results: RowResult[];
};

export type LogEntry = {
  level: 'info' | 'warn' | 'error';
  phase: 'reset' | 'import' | 'verify' | 'report';
  rule?: string;
  legacyPk?: string;
  message: string;
};

export type Report = {
  phase: 'import' | 'verify';
  startedAt: string; // ISO
  finishedAt: string; // ISO
  exitCode: 0 | 1 | 2;
  rules: Array<ImportRuleReport | VerifyRuleReport>;
  log: LogEntry[];
};
