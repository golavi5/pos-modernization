import { type MigrationConfig } from '../core/config.js';
import { connect } from '../core/db.js';
import { compareRow } from '../core/differ.js';
import { Reporter } from '../core/reporter.js';
import { orderedRules } from '../rules/_registry.js';
import { isMapRule } from '../types/Rule.js';
import type { Report, RowResult, VerifyRuleReport } from '../types/Report.js';
import type { RowDataPacket } from 'mysql2';

export type VerifyOptions = {
  reportsDir: string;
  /** Max non-ok rows kept per rule in the report sample. */
  sampleCap?: number;
};

/**
 * Read-only parity check. Legacy and target live on different servers (no
 * cross-server JOIN), so we pull legacy rows + the target's legacy_id-keyed
 * rows and diff them in-app via the differ. All mismatches are collected;
 * the run never halts early (design §7.3).
 */
export async function runVerify(
  cfg: MigrationConfig,
  opts: VerifyOptions,
): Promise<Report> {
  const cap = opts.sampleCap ?? 200;
  const reporter = new Reporter('verify', opts.reportsDir);
  const legacy = await connect(cfg.legacy);
  const target = await connect(cfg.target);

  try {
    for (const rule of orderedRules()) {
      if (!isMapRule(rule)) continue;

      const [legacyRows] = await legacy.query<RowDataPacket[]>(
        `SELECT * FROM \`${rule.source}\``,
      );
      const [targetRows] = await target.query<RowDataPacket[]>(
        `SELECT * FROM \`${rule.target}\` WHERE \`legacy_id\` IS NOT NULL`,
      );
      const byLegacyId = new Map<string, RowDataPacket>();
      for (const r of targetRows) byLegacyId.set(String(r.legacy_id), r);

      const sample: RowResult[] = [];
      let ok = 0;
      let missing = 0;
      let mismatched = 0;

      for (const lrow of legacyRows) {
        const pk = String(lrow[rule.idMap.legacyKey]);
        const migrated = byLegacyId.get(pk) ?? null;
        const result = compareRow(rule, lrow, migrated);
        if (result.status === 'ok') ok++;
        else {
          if (result.status === 'missing') missing++;
          else mismatched++;
          if (sample.length < cap) sample.push(result);
        }
      }

      const report: VerifyRuleReport = {
        source: rule.source,
        target: rule.target,
        status: missing + mismatched === 0 ? 'passed' : 'failed',
        rowsCompared: legacyRows.length,
        ok,
        missing,
        mismatched,
        results: sample,
      };
      reporter.emit({
        level: report.status === 'passed' ? 'info' : 'error',
        phase: 'verify',
        rule: rule.source,
        message: `${report.status}: ${ok} ok, ${missing} missing, ${mismatched} mismatched (of ${legacyRows.length})`,
      });
      reporter.addRule(report);
    }
  } finally {
    await legacy.end();
    await target.end();
  }

  const { report } = await reporter.flush();
  return report;
}
