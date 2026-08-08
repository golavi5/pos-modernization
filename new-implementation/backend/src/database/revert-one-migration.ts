import { createInterface } from 'readline';
import { DataSource, Migration, MigrationExecutor } from 'typeorm';
import { dataSourceOptions } from './data-source';

/**
 * Guarded production migration revert — undoes **exactly one** migration.
 *
 * Shipped compiled (`dist/database/revert-one-migration.js`) so the production
 * image, which only carries `dist` + prod deps, can run it. Invoked as
 * `npm run migration:revert-one:prod`; see `STAGING-ROLLBACK-RUNBOOK.md` §3 B2.
 *
 * The bare CLI (`typeorm migration:revert`) pops the ledger head with no notion
 * of which deploy was bad. Two blind invocations on this repo reach
 * `InitialSchema`, whose `down()` drops all 15 tables. So this wrapper prints
 * the ledger and requires the operator to type the head migration's **exact
 * name** — a generic "yes" is too easy to answer twice under incident pressure.
 *
 * There is deliberately **no** `CONFIRM=yes` bypass. `db-restore.sh` has one for
 * cron; this has no automated caller, and on the one destructive step a human
 * runs, the prompt is the guard. Do not add one.
 */

/** Exit codes: 0 reverted, 1 refused/aborted (schema untouched), 2 revert failed. */
const OK = 0;
const REFUSED = 1;
const FAILED = 2;

const WEDGE = `
✖ The revert FAILED PART-WAY. MySQL auto-commits DDL, so the schema may now be
  half-reverted while the ledger row is still present — re-running this will
  re-attempt statements that already succeeded and fail again.

  Do NOT retry. Switch to §3 B1 (restore the pre-migration backup).`;

function line(m: Migration, marker: string): string {
  return `  ${marker} ${m.name}`;
}

async function confirmName(expected: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await new Promise<string>((resolve) =>
      rl.question(
        `\nType the migration name EXACTLY to revert it (anything else aborts):\n> `,
        resolve,
      ),
    );
    return answer.trim() === expected;
  } finally {
    rl.close();
  }
}

/** Ledger head last; `getExecutedMigrations()` returns newest-first. */
async function ledger(executor: MigrationExecutor): Promise<Migration[]> {
  const executed = await executor.getExecutedMigrations();
  return [...executed].sort((a, b) => a.timestamp - b.timestamp);
}

async function main(): Promise<number> {
  // Checked before the TTY guard so it is reachable from the unit suite, which
  // has no pty. `DataSource.initialize()` itself runs pending migrations when
  // this is set, and — the real hazard — a container restart after the revert
  // would re-apply exactly what was just undone. Overriding the option below
  // protects this process; only turning the flag off protects the container.
  if (process.env.DB_RUN_MIGRATIONS === 'true') {
    console.error(
      '✖ DB_RUN_MIGRATIONS=true. The backend re-applies pending migrations on\n' +
        '  every boot, so this revert would be undone by the next restart (the\n' +
        '  failing health check will cause one).\n\n' +
        '  Set DB_RUN_MIGRATIONS=false on the backend service first, let it\n' +
        '  restart, then run this again. Restore the flag after the target\n' +
        '  commit is redeployed. See runbook §3 B2 step 2.',
    );
    return REFUSED;
  }

  if (!process.stdin.isTTY) {
    console.error(
      '✖ Refusing to run without a TTY. This is an interactive, destructive\n' +
        '  operation — run it from a terminal (Coolify → backend → Terminal, or\n' +
        '  `docker exec -it`). There is no unattended mode by design.',
    );
    return REFUSED;
  }

  const dataSource = new DataSource({
    ...dataSourceOptions,
    migrationsRun: false,
  });
  await dataSource.initialize();

  try {
    const executor = new MigrationExecutor(dataSource);
    const executed = await ledger(executor);

    if (executed.length === 0) {
      console.error('✖ The migration ledger is empty — nothing to revert.');
      return REFUSED;
    }

    const head = executed[executed.length - 1];
    const pending = await executor.getPendingMigrations();

    console.log(`\nLedger (${dataSourceOptions.database}), oldest first:`);
    executed.forEach((m) => console.log(line(m, m === head ? '→' : ' ')));
    if (pending.length > 0) {
      console.log(`\n  ${pending.length} migration(s) pending (not applied):`);
      pending.forEach((m) => console.log(line(m, '·')));
    }

    console.log(
      `\n⚠ This reverts ONE migration — the ledger head, "${head.name}".\n` +
        '  It is not the inverse of `migration:run:prod`, which applies ALL\n' +
        '  pending migrations. Repeat this command, re-reading the ledger each\n' +
        "  time, until the head is the TARGET commit's last migration.\n" +
        '  Confirm the B2 preflight (runbook §3) before answering.',
    );

    if (executed.length === 1) {
      console.log(
        `\n⚠⚠ "${head.name}" is the ONLY applied migration. Reverting it runs its\n` +
          '   down() against a schema with nothing beneath it — on this repo that\n' +
          '   drops every table and all data. This is almost never what a rollback\n' +
          '   needs; use §3 B1 (backup restore) instead.',
      );
    }

    if (!(await confirmName(head.name))) {
      console.error('\nAborted — name did not match. Nothing was reverted.');
      return REFUSED;
    }

    try {
      await executor.undoLastMigration();
    } catch (err) {
      console.error(WEDGE);
      console.error(err);
      return FAILED;
    }

    const after = await ledger(executor);
    const newHead = after[after.length - 1];
    console.log(
      `\n✔ Reverted "${head.name}".\n` +
        `  Ledger head is now: ${newHead ? newHead.name : '(empty — no migrations applied)'}\n` +
        '  Re-check it against the target commit before reverting again or\n' +
        '  redeploying (runbook §4 check 5).',
    );
    return OK;
  } finally {
    await dataSource.destroy();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(FAILED);
  });
