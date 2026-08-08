import { spawnSync } from 'child_process';
import { resolve } from 'path';

/**
 * Guards on `revert-one-migration.ts`. Both refusals under test fire **before**
 * any DataSource is constructed, so this spec needs no database — which is the
 * point: the failure the guards exist to prevent is a destructive revert that
 * runs when it should not have.
 *
 * The interactive path (typed-name confirmation, single-migration warning, the
 * revert itself) needs a pty and a live MySQL; it is rehearsed by hand and
 * recorded in `STAGING-DRY-RUN-RESULTS.md`.
 */
const SCRIPT = resolve(__dirname, 'revert-one-migration.ts');

/** Runs the TS entry point directly — `dist` is not built by `npm test`. */
function runRevert(env: Record<string, string>) {
  return spawnSync(
    process.execPath,
    ['-r', 'ts-node/register/transpile-only', SCRIPT],
    {
      // stdin is a pipe here, never a TTY — that is what the TTY guard sees.
      env: {
        ...process.env,
        DB_HOST: '203.0.113.1', // TEST-NET-3: a connect would hang/fail loudly
        DB_NAME: 'should_never_be_touched',
        ...env,
      },
      encoding: 'utf8',
      timeout: 60_000,
    },
  );
}

describe('revert-one-migration', () => {
  it('refuses when DB_RUN_MIGRATIONS=true, before touching the database', () => {
    const run = runRevert({ DB_RUN_MIGRATIONS: 'true' });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('DB_RUN_MIGRATIONS=true');
    expect(run.stderr).toContain('Set DB_RUN_MIGRATIONS=false');
    // Refused, not attempted: no connection was opened to the unreachable host.
    expect(run.stderr).not.toContain('203.0.113.1');
  });

  it('refuses to run unattended (no TTY on stdin)', () => {
    const run = runRevert({ DB_RUN_MIGRATIONS: 'false' });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('without a TTY');
  });

  it('has no CONFIRM-style bypass for either guard', () => {
    const bypassAttempts = [
      { CONFIRM: 'yes', DB_RUN_MIGRATIONS: 'true' },
      { CONFIRM: 'yes', DB_RUN_MIGRATIONS: 'false' },
      { FORCE: '1', DB_RUN_MIGRATIONS: 'false' },
    ];

    for (const env of bypassAttempts) {
      expect(runRevert(env).status).toBe(1);
    }
  });
});
