import { ruleOrder } from '../rules/_registry.js';
import { compare } from '../core/differ.js';
import { applyFields } from '../core/applyFields.js';
import { newId } from '../core/idMap.js';
import { pool, targetSchema, legacySchema } from '../core/targetDb.js';
import { loadLookups } from '../core/lookups.js';
import { resolveTenant } from '../core/legacyDb.js';
import type { TransformCtx } from '../types/Rule.js';
import type { RuleResult, RowResult } from '../types/Report.js';

const BATCH = 500;

export async function runVerify(): Promise<RuleResult[]> {
  const p = pool(); const legacy = legacySchema(); const target = targetSchema();
  const results: RuleResult[] = [];
  try {
    const lookups = await loadLookups(p, legacy);
    const tenant = await resolveTenant(p, legacy);
    for (const rule of ruleOrder()) {
      const [legacyRows] = await p.query<any[]>(`SELECT * FROM \`${legacy}\`.\`${rule.source}\``);
      const nonOk: RowResult[] = []; let verified = 0;
      for (let i = 0; i < legacyRows.length; i += BATCH) {
        const slice = legacyRows.slice(i, i + BATCH);
        const ids = slice.map((r) => newId(rule.idMap, rule.source, r[rule.idMap.legacyKey]));
        const [migrated] = await p.query<any[]>(
          `SELECT * FROM \`${target}\`.\`${rule.target}\` WHERE legacy_id IN (${slice.map(() => '?').join(',')})`,
          slice.map((r) => String(r[rule.idMap.legacyKey])),
        );
        const byLegacyId = new Map(migrated.map((m) => [String(m.legacy_id), m]));
        for (const row of slice) {
          const ctx: TransformCtx = { row, source: rule.source, lookups, companyId: tenant.companyId, bootstrapUserId: tenant.bootstrapUserId };
          const legacyPk = String(row[rule.idMap.legacyKey]);
          const { target: expected } = applyFields(rule, row, '', ctx);
          const res = compare(legacyPk, expected, byLegacyId.get(legacyPk) ?? null, rule.fields);
          verified++; if (res.status !== 'ok') nonOk.push(res);
        }
      }
      results.push({ source: rule.source, target: rule.target, status: nonOk.length ? 'failed' : 'passed', rowsVerified: verified, mismatches: nonOk, errors: [] });
    }
    return results;
  } finally { await p.end(); }
}
