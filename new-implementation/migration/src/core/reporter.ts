import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Report, RuleResult } from '../types/Report.js';

export function buildReport(phase: 'import' | 'verify', results: RuleResult[], startedAt: string): Report {
  let mismatches = 0, missing = 0, errors = 0;
  for (const r of results) {
    errors += r.errors.length;
    for (const m of r.mismatches) { if (m.status === 'missing') missing++; else if (m.status === 'mismatch') mismatches++; }
  }
  const failed = results.some((r) => r.status === 'failed' || r.status === 'blocked_by_dependency');
  const exitCode: 0 | 1 | 2 = (mismatches || missing || failed) ? 1 : 0;
  return { startedAt, phase, rules: results, summary: { rules: results.length, mismatches, missing, errors }, exitCode };
}

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function renderHtml(report: Report): string {
  const rows = report.rules.map((r) => `<tr class="${esc(r.status)}"><td>${esc(r.source)}</td><td>${esc(r.target ?? '—')}</td><td>${esc(r.status)}</td><td>${esc(r.rowsVerified ?? r.rowsImported ?? 0)}</td><td>${r.mismatches.length}</td><td>${r.errors.length}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>M4 Parity — ${esc(report.phase)}</title>
<style>body{font:14px system-ui;margin:2rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}.failed,.blocked_by_dependency{background:#fde}.partial{background:#ffd}.passed{background:#efe}</style></head><body>
<h1>M4 Parity Report</h1><p>Phase ${esc(report.phase)} · ${esc(report.startedAt)} · exit ${report.exitCode}</p>
<p>Rules ${report.summary.rules} · Mismatch ${report.summary.mismatches} · Missing ${report.summary.missing} · Errors ${report.summary.errors}</p>
<table><thead><tr><th>Source</th><th>Target</th><th>Status</th><th>Rows</th><th>Mismatch</th><th>Errors</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

export async function writeReport(dir: string, report: Report) {
  await mkdir(dir, { recursive: true });
  const jsonPath = join(dir, 'report.json'); const htmlPath = join(dir, 'report.html');
  await writeFile(jsonPath, JSON.stringify(report, null, 2)); await writeFile(htmlPath, renderHtml(report));
  return { jsonPath, htmlPath };
}
