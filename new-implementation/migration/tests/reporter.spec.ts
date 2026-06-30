import { describe, it, expect } from 'vitest';
import { buildReport, renderHtml } from '../src/core/reporter.js';
import type { RuleResult } from '../src/types/Report.js';

const results: RuleResult[] = [
  { source: 'clientes', target: 'customers', status: 'passed', rowsVerified: 3, mismatches: [], errors: [] },
  { source: 'encabezados', target: 'orders', status: 'failed', rowsVerified: 2, errors: [],
    mismatches: [{ status: 'missing', legacyPk: '9' }, { status: 'mismatch', legacyPk: '8', fields: [{ field: 'total_amount', legacy: 10, migrated: 9 }] }] },
];

describe('buildReport', () => {
  it('aggregates and sets exitCode 1 on mismatch/missing', () => {
    const r = buildReport('verify', results, '2026-06-29T00:00:00.000Z');
    expect(r.summary).toEqual({ rules: 2, mismatches: 1, missing: 1, errors: 0 });
    expect(r.exitCode).toBe(1);
  });
  it('exitCode 0 when all pass', () => {
    expect(buildReport('verify', [results[0]], '2026-06-29T00:00:00.000Z').exitCode).toBe(0);
  });
  it('renders self-contained HTML mentioning each rule', () => {
    const html = renderHtml(buildReport('verify', results, '2026-06-29T00:00:00.000Z'));
    expect(html).toContain('<html'); expect(html).toContain('encabezados'); expect(html).not.toContain('<script');
  });
});
