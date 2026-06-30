export type VerifyMode = 'exact' | 'ignore' | { tolerance: number };

export type TransformCtx = {
  row: Record<string, unknown>;     // full legacy row
  source: string;                   // legacy table name
  lookups: Record<string, Map<string, any>>; // preloaded helper tables, keyed by name
  companyId: string;                // single-tenant company uuid
  bootstrapUserId: string;          // for NOT-NULL created_by
};

export type FieldMap = {
  from: string | null;              // legacy column; null = computed purely from ctx
  to: string;                       // target column
  transform?: (v: unknown, ctx: TransformCtx) => unknown;
  verify?: VerifyMode;              // default 'exact'
};

export type IdMap = { legacyKey: string; newKey: 'uuid-v4' | 'deterministic' };

export type MapRule = {
  kind: 'map';
  source: string; target: string;
  idMap: IdMap;
  fields: FieldMap[];
  dependsOn?: string[];
  maxRowErrors?: number;            // default 0
};

export type SkipRule = { kind: 'skip'; source: string; reason: string; category: 'fiscal-M5' | 'reference' | 'new-app-table' };

export type Rule = MapRule | SkipRule;
