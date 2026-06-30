import { Command } from 'commander';
import chalk from 'chalk';
import { runReset } from './commands/reset.js';
import { runImport } from './commands/import.js';
import { runVerify } from './commands/verify.js';
import { runReport } from './commands/report.js';
import { buildReport, writeReport } from './core/reporter.js';
import { assertAllTablesClassified } from './core/preflight.js';
import { pool, legacySchema } from './core/targetDb.js';

function requireMigrationEnv(): void {
  if (process.env.NODE_ENV !== 'migration') { console.error(chalk.red('refusing to run: NODE_ENV must be "migration"')); process.exit(2); }
}
async function preflight(): Promise<void> { const p = pool(); try { await assertAllTablesClassified(p, legacySchema()); } finally { await p.end(); } }
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const program = new Command();
program.name('migrate').description('M4 legacy parity-validation CLI');
program.command('reset').action(async () => { requireMigrationEnv(); await runReset(); console.log(chalk.green('target provisioned')); });
program.command('import').option('--dry-run').action(async (o) => {
  requireMigrationEnv(); await preflight();
  const report = buildReport('import', await runImport({ dryRun: !!o.dryRun }), new Date().toISOString());
  await writeReport(`reports/${stamp()}`, report);
  console.log(chalk.cyan(`import done — ${report.summary.errors} row errors`)); process.exit(report.exitCode);
});
program.command('verify').action(async () => {
  await preflight();
  const report = buildReport('verify', await runVerify(), new Date().toISOString());
  await writeReport(`reports/${stamp()}`, report);
  console.log(report.exitCode === 0 ? chalk.green('parity OK') : chalk.red('parity FAILED')); process.exit(report.exitCode);
});
program.command('report').action(async () => { console.log(await runReport()); });
program.parseAsync().catch((e) => { console.error(chalk.red(e.message)); process.exit(2); });
