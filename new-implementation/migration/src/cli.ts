#!/usr/bin/env node
import { Command } from 'commander';
import { join } from 'node:path';
import { loadConfig } from './core/config.js';
import { runReset } from './commands/reset.js';
import { runImport } from './commands/import.js';
import { runVerify } from './commands/verify.js';
import { runReport } from './commands/report.js';

const REPORTS_DIR = join(process.cwd(), 'reports');

const program = new Command();
program
  .name('migrate')
  .description('M4 legacy-migration parity-validation CLI (POS-MIGR-001)');

program
  .command('reset')
  .description('drop + recreate the migration target DB from backend migrations')
  .option('--migrations-dir <dir>', 'override backend migrations dir')
  .action(async (o) => {
    await runReset(loadConfig(), { migrationsDir: o.migrationsDir });
  });

program
  .command('import')
  .description('load legacy rows into the target via the rule registry')
  .option('--max-row-errors <n>', 'global per-table row-error tolerance', '0')
  .option('--dry-run', 'apply transforms but write nothing', false)
  .action(async (o) => {
    const report = await runImport(loadConfig(), {
      reportsDir: REPORTS_DIR,
      maxRowErrors: Number(o.maxRowErrors),
      dryRun: o.dryRun,
    });
    process.exitCode = report.exitCode;
  });

program
  .command('verify')
  .description('field-by-field parity diff legacy ↔ target (read-only)')
  .action(async () => {
    const report = await runVerify(loadConfig(), { reportsDir: REPORTS_DIR });
    process.exitCode = report.exitCode;
  });

program
  .command('report')
  .description('render report.html from the latest report.json')
  .action(async () => {
    await runReport(REPORTS_DIR);
  });

program.parseAsync().catch((e) => {
  console.error(`[migrate] ${e instanceof Error ? e.message : e}`);
  process.exitCode = 2;
});
