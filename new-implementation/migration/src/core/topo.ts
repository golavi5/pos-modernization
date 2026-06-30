import { isMapRule, type Rule } from '../types/Rule.js';

/**
 * Topologically sort rules by their `dependsOn` (which references other rules'
 * `source` table names). Throws on an unknown dependency or a cycle, printing
 * the offending path — these are infrastructure errors (exit 2).
 */
export function topoSortRules(rules: Rule[]): Rule[] {
  const bySource = new Map<string, Rule>();
  for (const r of rules) {
    if (bySource.has(r.source)) {
      throw new Error(`Duplicate rule for source table "${r.source}"`);
    }
    bySource.set(r.source, r);
  }

  const deps = (r: Rule): string[] => (isMapRule(r) ? r.dependsOn ?? [] : []);

  for (const r of rules) {
    for (const d of deps(r)) {
      if (!bySource.has(d)) {
        throw new Error(
          `Rule "${r.source}" dependsOn unknown source "${d}"`,
        );
      }
    }
  }

  const sorted: Rule[] = [];
  const state = new Map<string, 'visiting' | 'done'>();

  const visit = (source: string, path: string[]): void => {
    const s = state.get(source);
    if (s === 'done') return;
    if (s === 'visiting') {
      throw new Error(
        `Dependency cycle: ${[...path, source].join(' -> ')}`,
      );
    }
    state.set(source, 'visiting');
    const rule = bySource.get(source)!;
    for (const d of deps(rule)) visit(d, [...path, source]);
    state.set(source, 'done');
    sorted.push(rule);
  };

  for (const r of rules) visit(r.source, []);
  return sorted;
}
