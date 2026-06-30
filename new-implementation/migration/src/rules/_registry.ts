import { isMapRule, type MapRule, type Rule } from '../types/Rule.js';
import { topoSortRules } from '../core/topo.js';
import customers from './customers.rule.js';

/**
 * Every legacy table maps to exactly one rule. Unknown legacy tables (present
 * in the dump but absent here) halt the run — add a `map`, `skip`, or
 * `archive` rule to acknowledge them deliberately.
 *
 * Only `tblCustomers` is authored so far: it is the first parity seam (no
 * outgoing FKs). products / orders (tblSales) / payments follow once the real
 * dump's table + column names are known (design §9 open question).
 */
export const rules: Rule[] = [customers];

/** Rules in dependency-safe execution order. */
export function orderedRules(): Rule[] {
  return topoSortRules(rules);
}

export function ruleBySource(source: string): Rule | undefined {
  return rules.find((r) => r.source === source);
}

export function mapRules(): MapRule[] {
  return rules.filter(isMapRule);
}

/** Distinct target tables of all map rules — the tables that get `legacy_id`. */
export function mapRuleTargets(): string[] {
  return [...new Set(mapRules().map((r) => r.target))];
}
