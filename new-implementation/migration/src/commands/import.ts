import { ruleOrder } from '../rules/_registry.js';
import { applyFields } from '../core/applyFields.js';
import { newId } from '../core/idMap.js';
import { pool, targetSchema, legacySchema } from '../core/targetDb.js';
import { loadLookups } from '../core/lookups.js';
import { resolveTenant } from '../core/legacyDb.js';
import type { MapRule, TransformCtx } from '../types/Rule.js';
import type { RuleResult, RowError } from '../types/Report.js';

const BATCH = 500;

export async function runImport(opts: { dryRun?: boolean } = {}): Promise<RuleResult[]> {
  const p = pool(); const legacy = legacySchema(); const target = targetSchema();
  const results: RuleResult[] = []; const failed = new Set<string>();
  try {
    const lookups = await loadLookups(p, legacy);
    const tenant = await resolveTenant(p, legacy);
    for (const rule of ruleOrder()) {
      if ((rule.dependsOn ?? []).some((d) => failed.has(d))) {
        results.push({ source: rule.source, target: rule.target, status: 'blocked_by_dependency', mismatches: [], errors: [] });
        failed.add(rule.source);   // propagate: dependents of a blocked rule must also block
        continue;
      }
      const res = await importRule(p, legacy, target, rule, lookups, tenant, opts.dryRun ?? false);
      results.push(res); if (res.status === 'failed') failed.add(rule.source);
    }
    return results;
  } finally { await p.end(); }
}

async function importRule(p: any, legacy: string, target: string, rule: MapRule, lookups: any, tenant: any, dryRun: boolean): Promise<RuleResult> {
  const errors: RowError[] = []; const maxErrors = rule.maxRowErrors ?? 0; let imported = 0;
  const conn = await p.getConnection();
  try {
    if (!dryRun) await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT * FROM \`${legacy}\`.\`${rule.source}\``);
    for (let i = 0; i < rows.length; i += BATCH) {
      for (const row of rows.slice(i, i + BATCH)) {
        const ctx: TransformCtx = { row, source: rule.source, lookups, companyId: tenant.companyId, bootstrapUserId: tenant.bootstrapUserId };
        const legacyPk = String(row[rule.idMap.legacyKey]);
        const id = newId(rule.idMap, rule.source, row[rule.idMap.legacyKey]);
        const { target: t, errors: rowErrors } = applyFields(rule, row, id, ctx);
        if (rowErrors.length) { errors.push(...rowErrors); continue; }
        if (dryRun) { imported++; continue; }
        const cols = Object.keys(t);
        const updates = cols.filter((c) => c !== 'id' && c !== 'legacy_id').map((c) => `\`${c}\`=VALUES(\`${c}\`)`).join(',');
        // A constraint violation (NOT NULL date, FK orphan, length…) is captured per-row, not
        // thrown: one bad legacy row must not abort the whole migration. InnoDB rolls back only
        // the failed statement, so the surrounding transaction stays usable for the rest.
        try {
          await conn.query(
            `INSERT INTO \`${target}\`.\`${rule.target}\` (${cols.map((c) => `\`${c}\``).join(',')})
             VALUES (${cols.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${updates}`,
            cols.map((c) => t[c] ?? null),
          );
          imported++;
        } catch (e) {
          errors.push({ rule: rule.source, legacyPk, cause: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    if (errors.length > maxErrors) { if (!dryRun) await conn.rollback(); return { source: rule.source, target: rule.target, status: 'failed', rowsImported: 0, mismatches: [], errors }; }
    if (!dryRun) await conn.commit();
    return { source: rule.source, target: rule.target, status: errors.length ? 'partial' : 'passed', rowsImported: imported, mismatches: [], errors };
  } catch (e) { if (!dryRun) await conn.rollback(); throw e; } finally { conn.release(); }
}
