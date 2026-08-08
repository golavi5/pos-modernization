import { execFileSync, spawnSync } from 'child_process';
import { chmodSync, mkdtempSync, readdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * Tests `new-implementation/scripts/db-backup.sh` by putting a stub `mysqldump`
 * on PATH. The spec lives under `backend/src` because that is jest's `rootDir`,
 * which is what makes it run in CI alongside the unit suite.
 *
 * The behaviour under test is failure handling: a dump that dies mid-stream must
 * not leave an archive behind, because a truncated `.sql.gz` is indistinguishable
 * by name from a good one and retention would later prune the last known-good
 * backups in its favour.
 */
const SCRIPT = resolve(__dirname, '../../../scripts/db-backup.sh');

function stubMysqldump(dir: string, body: string): void {
  const path = join(dir, 'mysqldump');
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(path, 0o755);
}

function runBackup(binDir: string, backupDir: string) {
  return spawnSync('bash', [SCRIPT], {
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      DB_PASSWORD: 'irrelevant',
      DB_NAME: 'pos_db',
      BACKUP_DIR: backupDir,
    },
    encoding: 'utf8',
  });
}

const archives = (dir: string) =>
  readdirSync(dir).filter((f) => f.endsWith('.sql.gz'));

describe('db-backup.sh', () => {
  let binDir: string;
  let backupDir: string;

  beforeEach(() => {
    const root = mkdtempSync(join(tmpdir(), 'pos-backup-'));
    binDir = join(root, 'bin');
    backupDir = join(root, 'backups');
    execFileSync('mkdir', ['-p', binDir, backupDir]);
  });

  it('writes one verifiable archive when the dump succeeds', () => {
    stubMysqldump(binDir, 'echo "-- dump of $*"');

    const run = runBackup(binDir, backupDir);

    expect(run.status).toBe(0);
    const written = archives(backupDir);
    expect(written).toHaveLength(1);
    // -t fails on a truncated member, so this asserts a complete archive.
    execFileSync('gzip', ['-t', join(backupDir, written[0])]);
  });

  it('leaves no archive behind when the dump dies mid-stream', () => {
    stubMysqldump(binDir, 'echo "-- partial"\nexit 1');

    const run = runBackup(binDir, backupDir);

    expect(run.status).not.toBe(0);
    expect(archives(backupDir)).toHaveLength(0);
  });

  it('leaves no scratch file behind on failure', () => {
    stubMysqldump(binDir, 'echo "-- partial"\nexit 1');

    runBackup(binDir, backupDir);

    // Not just no *.sql.gz — no temp/partial file under any name either.
    expect(readdirSync(backupDir)).toHaveLength(0);
  });
});
