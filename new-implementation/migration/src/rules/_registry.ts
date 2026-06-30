import type { Rule, MapRule } from '../types/Rule.js';
import { topoSort } from '../core/topo.js';
import { SKIPS } from './_skips.js';
import companies from './companies.rule.js';
import customers from './customers.rule.js';
import products from './products.rule.js';
import orders from './orders.rule.js';
import orderItems from './order-items.rule.js';
import payments from './payments.rule.js';
import users from './users.rule.js';

const MAPS: MapRule[] = [companies, customers, products, orders, orderItems, payments, users] as MapRule[];
export const RULES: Rule[] = [...MAPS, ...SKIPS];
export const ruleBySource = new Map<string, Rule>(RULES.map((r) => [r.source, r]));
export const allLegacyTables: string[] = RULES.map((r) => r.source);

export function ruleOrder(): MapRule[] {
  const names = MAPS.map((r) => r.source);
  const edges: Record<string, string[]> = {};
  for (const r of MAPS) edges[r.source] = (r.dependsOn ?? []).filter((d) => names.includes(d));
  return topoSort(names, edges).map((s) => MAPS.find((r) => r.source === s)!);
}
