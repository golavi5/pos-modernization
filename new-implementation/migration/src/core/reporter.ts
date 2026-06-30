import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ImportRuleReport,
  LogEntry,
  Report,
  VerifyRuleReport,
} from '../types/Report.js';

/**
 * Accumulates structured log + per-rule results and serializes a Report.
 * One Reporter per command run.
 */
export class Reporter {
  private readonly startedAt = new Date().toISOString();
  private readonly log: LogEntry[] = [];
  private readonly rules: Array<ImportRuleReport | VerifyRuleReport> = [];

  constructor(
    private readonly phase: 'import' | 'verify',
    private readonly reportsDir: string,
  ) {}

  emit(entry: LogEntry): void {
    this.log.push(entry);
    const prefix = `[${entry.phase}]${entry.rule ? ` ${entry.rule}` : ''}`;
    const line = `${prefix} ${entry.message}`;
    if (entry.level === 'error') console.error(line);
    else if (entry.level === 'warn') console.warn(line);
    else console.log(line);
  }

  addRule(r: ImportRuleReport | VerifyRuleReport): void {
    this.rules.push(r);
  }

  /** Exit code: 0 all-pass, 1 mismatch/missing/failed rule, 2 set by caller. */
  private computeExitCode(): 0 | 1 {
    for (const r of this.rules) {
      if (r.status === 'failed' || r.status === 'blocked_by_dependency') return 1;
      if ('mismatched' in r && (r.mismatched > 0 || r.missing > 0)) return 1;
    }
    return 0;
  }

  build(exitCode?: 0 | 1 | 2): Report {
    return {
      phase: this.phase,
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: exitCode ?? this.computeExitCode(),
      rules: this.rules,
      log: this.log,
    };
  }

  /** Writes report.json under reports/<ts>/ and returns the directory. */
  async flush(exitCode?: 0 | 1 | 2): Promise<{ dir: string; report: Report }> {
    const report = this.build(exitCode);
    const stamp = report.startedAt.replace(/[:.]/g, '-');
    const dir = join(this.reportsDir, stamp);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'report.json'), JSON.stringify(report, null, 2));
    return { dir, report };
  }
}
