import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Report, VerifyRuleReport } from '../types/Report.js';

/** Find the newest reports/<ts>/ dir holding a report.json. */
export async function latestReportDir(reportsDir: string): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(reportsDir);
  } catch {
    return null;
  }
  const dirs: { name: string; mtime: number }[] = [];
  for (const name of entries) {
    const full = join(reportsDir, name);
    try {
      const s = await stat(join(full, 'report.json'));
      dirs.push({ name: full, mtime: s.mtimeMs });
    } catch {
      /* not a report dir */
    }
  }
  if (dirs.length === 0) return null;
  dirs.sort((a, b) => b.mtime - a.mtime);
  return dirs[0].name;
}

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export function renderHtml(report: Report): string {
  const rows = report.rules
    .map((r) => {
      const isVerify = 'mismatched' in r;
      const v = r as VerifyRuleReport;
      const counts = isVerify
        ? `${v.ok} ok / ${v.missing} missing / ${v.mismatched} mismatched`
        : `${(r as any).rowsWritten} written / ${(r as any).rowErrors.length} errors`;
      return `<tr class="${esc(r.status)}"><td>${esc(r.source)}</td><td>${esc(
        (r as any).target ?? '',
      )}</td><td>${esc(r.status)}</td><td>${esc(counts)}</td></tr>`;
    })
    .join('\n');

  const mismatchDetail = report.rules
    .filter((r): r is VerifyRuleReport => 'results' in r && (r as VerifyRuleReport).results.length > 0)
    .map((r) => {
      const items = r.results
        .map((res) => {
          if (res.status === 'mismatch') {
            const fields = res.fields
              .map((f) => `${esc(f.field)}: <code>${esc(f.legacy)}</code> ≠ <code>${esc(f.migrated)}</code>`)
              .join('; ');
            return `<li><b>${esc(res.legacyPk)}</b> — ${fields}</li>`;
          }
          return `<li><b>${esc(res.legacyPk)}</b> — ${esc(res.status)}</li>`;
        })
        .join('\n');
      return `<h3>${esc(r.source)}</h3><ul>${items}</ul>`;
    })
    .join('\n');

  return `<!doctype html><html><head><meta charset="utf-8">
<title>Migration ${esc(report.phase)} report</title>
<style>
 body{font:14px system-ui,sans-serif;margin:2rem;color:#1a1a1a}
 table{border-collapse:collapse;width:100%;margin:1rem 0}
 th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}
 th{background:#f4f4f4}
 tr.passed td:nth-child(3){color:#137333;font-weight:600}
 tr.partial td:nth-child(3){color:#b06000;font-weight:600}
 tr.failed td:nth-child(3),tr.blocked_by_dependency td:nth-child(3){color:#c5221f;font-weight:600}
 code{background:#f4f4f4;padding:1px 4px;border-radius:3px}
 .meta{color:#666}
</style></head><body>
<h1>Migration ${esc(report.phase)} — exit ${esc(report.exitCode)}</h1>
<p class="meta">${esc(report.startedAt)} → ${esc(report.finishedAt)}</p>
<table><thead><tr><th>Source</th><th>Target</th><th>Status</th><th>Rows</th></tr></thead>
<tbody>${rows}</tbody></table>
${mismatchDetail ? `<h2>Discrepancies</h2>${mismatchDetail}` : '<p>No discrepancies.</p>'}
</body></html>`;
}

/** Render report.html next to the latest report.json. Returns the html path. */
export async function runReport(reportsDir: string): Promise<string> {
  const dir = await latestReportDir(reportsDir);
  if (!dir) throw new Error(`No reports found under ${reportsDir}`);
  const report: Report = JSON.parse(await readFile(join(dir, 'report.json'), 'utf8'));
  const html = renderHtml(report);
  const out = join(dir, 'report.html');
  await writeFile(out, html);
  console.log(`[report] wrote ${out}`);
  return out;
}
