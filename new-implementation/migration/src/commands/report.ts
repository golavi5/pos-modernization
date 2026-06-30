import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderHtml } from '../core/reporter.js';
import type { Report } from '../types/Report.js';
export async function runReport(reportsDir = 'reports'): Promise<string> {
  const entries = (await readdir(reportsDir)).sort();
  if (!entries.length) throw new Error(`no reports in ${reportsDir}`);
  const latest = join(reportsDir, entries[entries.length - 1]);
  const report = JSON.parse(await readFile(join(latest, 'report.json'), 'utf8')) as Report;
  const htmlPath = join(latest, 'report.html'); await writeFile(htmlPath, renderHtml(report)); return htmlPath;
}
