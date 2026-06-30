import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { StartedMySqlContainer } from '@testcontainers/mysql';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runReset } from '../src/commands/reset.js';
import { runImport } from '../src/commands/import.js';
import { runVerify } from '../src/commands/verify.js';
import { startTarget, startLegacy, makeCfg, targetRowCount } from './helpers.js';

let legacy: StartedMySqlContainer;
let target: StartedMySqlContainer;
let reportsDir: string;

beforeAll(async () => {
  [legacy, target] = await Promise.all([startLegacy('mini-legacy.sql'), startTarget()]);
  reportsDir = await mkdtemp(join(tmpdir(), 'm4-reports-'));
}, 180_000);

afterAll(async () => {
  await Promise.allSettled([legacy?.stop(), target?.stop()]);
});

describe('M4 parity seam (customers)', () => {
  it('reset → import → verify is green with zero discrepancies', async () => {
    const cfg = makeCfg(legacy, target);
    await runReset(cfg);

    const imp = await runImport(cfg, { reportsDir });
    expect(imp.exitCode).toBe(0);
    const impCustomers = imp.rules.find((r) => r.source === 'tblCustomers') as any;
    expect(impCustomers).toMatchObject({ status: 'passed', rowsWritten: 5 });

    const ver = await runVerify(cfg, { reportsDir });
    expect(ver.exitCode).toBe(0);
    const verCustomers = ver.rules.find((r) => r.source === 'tblCustomers') as any;
    expect(verCustomers).toMatchObject({ status: 'passed', ok: 5, missing: 0, mismatched: 0 });
  });

  it('is idempotent: a second import keeps verify green (no duplicates)', async () => {
    const cfg = makeCfg(legacy, target);
    await runImport(cfg, { reportsDir });
    const ver = await runVerify(cfg, { reportsDir });
    expect(ver.exitCode).toBe(0);
    expect(await targetRowCount(target, 'customers')).toBe(5); // not 10
  });
});
