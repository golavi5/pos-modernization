import { assertWriteSafe, type MigrationConfig } from '../core/config.js';
import { connect, listTables, type Conn } from '../core/db.js';
import { buildTargetRow } from '../core/mapRow.js';
import { assertNoUnknownTables } from '../core/preflight.js';
import { Reporter } from '../core/reporter.js';
import { orderedRules, rules as allRules } from '../rules/_registry.js';
import { isMapRule, isSkipRule, type MapRule } from '../types/Rule.js';
import type { ImportRuleReport, Report, RuleStatus } from '../types/Report.js';
import type { RowDataPacket } from 'mysql2';

export type ImportOptions = {
  reportsDir: string;
  maxRowErrors?: number; // global default; rule.maxRowErrors overrides
  dryRun?: boolean;
};

/** Build a parametrized upsert keyed on the table's unique constraints. */
function buildUpsert(table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const updates = cols
    .filter((c) => c !== 'id')
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ');
  const sql =
    `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) ` +
    `VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
  return { sql, params: cols.map((c) => row[c]) };
}

async function importMapRule(
  target: Conn,
  legacy: Conn,
  rule: MapRule,
  reporter: Reporter,
  opts: ImportOptions,
  blocked: boolean,
): Promise<ImportRuleReport> {
  const base: ImportRuleReport = {
    source: rule.source,
    target: rule.target,
    kind: 'map',
    status: 'passed',
    rowsRead: 0,
    rowsWritten: 0,
    rowErrors: [],
  };

  if (blocked) {
    reporter.emit({ level: 'warn', phase: 'import', rule: rule.source, message: 'blocked by failed dependency' });
    return { ...base, status: 'blocked_by_dependency' };
  }

  const limit = rule.maxRowErrors ?? opts.maxRowErrors ?? 0;

  // NOTE: fixtures are tiny so we read the whole table. Streaming with a
  // server-side cursor (design §6, batch 500) is the follow-up for 200k-row
  // real dumps — tracked, not silently dropped.
  const [rows] = await legacy.query<RowDataPacket[]>(
    `SELECT * FROM \`${rule.source}\``,
  );
  base.rowsRead = rows.length;

  if (!opts.dryRun) await target.beginTransaction();
  try {
    for (const legacyRow of rows) {
      const { target: targetRow, errors } = buildTargetRow(rule, legacyRow);
      if (errors.length > 0) {
        base.rowErrors.push(...errors);
        continue; // don't insert a row we couldn't fully transform
      }
      if (opts.dryRun) {
        base.rowsWritten++;
        continue;
      }
      // A constraint violation (NOT NULL, FK, …) is a per-row error to collect,
      // not a table halt (design §7.2). InnoDB rolls back only the failed
      // statement, so the transaction stays usable and we continue.
      try {
        const { sql, params } = buildUpsert(rule.target, targetRow);
        await target.query(sql, params);
        base.rowsWritten++;
      } catch (e) {
        base.rowErrors.push({
          rule: rule.source,
          legacyPk: String(legacyRow[rule.idMap.legacyKey]),
          cause: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (base.rowErrors.length > limit) {
      if (!opts.dryRun) await target.rollback();
      reporter.emit({ level: 'error', phase: 'import', rule: rule.source, message: `${base.rowErrors.length} row errors > max ${limit} — rolled back` });
      return { ...base, status: 'failed', rowsWritten: 0 };
    }

    if (!opts.dryRun) await target.commit();
    const status: RuleStatus = base.rowErrors.length > 0 ? 'partial' : 'passed';
    reporter.emit({ level: status === 'partial' ? 'warn' : 'info', phase: 'import', rule: rule.source, message: `${status}: ${base.rowsWritten} written, ${base.rowErrors.length} row errors` });
    return { ...base, status };
  } catch (e) {
    if (!opts.dryRun) await target.rollback().catch(() => {});
    throw e;
  }
}

export async function runImport(
  cfg: MigrationConfig,
  opts: ImportOptions,
): Promise<Report> {
  assertWriteSafe(cfg);
  const reporter = new Reporter('import', opts.reportsDir);
  const legacy = await connect(cfg.legacy);
  const target = await connect(cfg.target);
  const failedSources = new Set<string>();

  try {
    // Pre-flight (design §7.1): every legacy table must have a rule, else halt.
    const legacyTables = await listTables(legacy, cfg.legacy.database);
    assertNoUnknownTables(legacyTables, allRules.map((r) => r.source));

    for (const rule of orderedRules()) {
      if (isSkipRule(rule)) {
        reporter.emit({ level: 'info', phase: 'import', rule: rule.source, message: `skipped: ${rule.reason}` });
        reporter.addRule({ source: rule.source, kind: 'skip', status: 'skipped', rowsRead: 0, rowsWritten: 0, rowErrors: [] });
        continue;
      }
      if (!isMapRule(rule)) {
        // archive: deferred until the real dump surfaces a table that needs it.
        throw new Error(`archive rules not yet implemented (${rule.source})`);
      }
      const blocked = (rule.dependsOn ?? []).some((d) => failedSources.has(d));
      const report = await importMapRule(target, legacy, rule, reporter, opts, blocked);
      if (report.status === 'failed' || report.status === 'blocked_by_dependency') {
        failedSources.add(rule.source);
      }
      reporter.addRule(report);
    }
  } finally {
    await legacy.end();
    await target.end();
  }

  const { report } = await reporter.flush();
  return report;
}
