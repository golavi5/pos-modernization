export type RowError = { rule: string; legacyPk: string; field?: string; cause: string };
export type Mismatch = { field: string; legacy: unknown; migrated: unknown };

export type RowResult =
  | { status: 'ok'; legacyPk: string }
  | { status: 'missing'; legacyPk: string }
  | { status: 'mismatch'; legacyPk: string; fields: Mismatch[] };

export type RuleStatus = 'passed' | 'partial' | 'failed' | 'skipped' | 'blocked_by_dependency';

export type RuleResult = {
  source: string; target?: string; status: RuleStatus;
  rowsImported?: number; rowsVerified?: number;
  mismatches: RowResult[]; errors: RowError[];
};

export type Report = {
  startedAt: string; phase: 'import' | 'verify';
  rules: RuleResult[];
  summary: { rules: number; mismatches: number; missing: number; errors: number };
  exitCode: 0 | 1 | 2;
};
