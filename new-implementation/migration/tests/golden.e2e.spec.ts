import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { StartedMySqlContainer } from '@testcontainers/mysql';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runReset } from '../src/commands/reset.js';
import { runImport } from '../src/commands/import.js';
import { runVerify } from '../src/commands/verify.js';
import { startTarget, startLegacy, makeCfg, targetRowCount } from './helpers.js';

// Failure-mode golden tests (design §8.4). One target, fresh legacy per case.
let target: StartedMySqlContainer;
const legacies: StartedMySqlContainer[] = [];
let reportsDir: string;

beforeAll(async () => {
  target = await startTarget();
  reportsDir = await mkdtemp(join(tmpdir(), 'm4-golden-'));
}, 180_000);

afterAll(async () => {
  await Promise.allSettled([target?.stop(), ...legacies.map((l) => l.stop())]);
});

async function legacyFrom(fixture: string): Promise<StartedMySqlContainer> {
  const l = await startLegacy(fixture);
  legacies.push(l);
  return l;
}

describe('corrupt-dates', () => {
  it('with tolerance: bad row → RowError, table commits `partial`, good rows land', async () => {
    const legacy = await legacyFrom('corrupt-dates.sql');
    const cfg = makeCfg(legacy, target);
    await runReset(cfg);

    const imp = await runImport(cfg, { reportsDir, maxRowErrors: 5 });
    const rule = imp.rules.find((r) => r.source === 'tblCustomers') as any;
    expect(rule.status).toBe('partial');
    expect(rule.rowsWritten).toBe(2);
    expect(rule.rowErrors).toHaveLength(1);
    expect(rule.rowErrors[0]).toMatchObject({ field: 'created_at', legacyPk: '2' });

    // The bad row was not written → verify flags it missing.
    const ver = await runVerify(cfg, { reportsDir });
    expect(ver.exitCode).toBe(1);
    const v = ver.rules.find((r) => r.source === 'tblCustomers') as any;
    expect(v).toMatchObject({ ok: 2, missing: 1, mismatched: 0 });
  });

  it('with default zero tolerance: table is rolled back and marked `failed`', async () => {
    const legacy = await legacyFrom('corrupt-dates.sql');
    const cfg = makeCfg(legacy, target);
    await runReset(cfg);

    const imp = await runImport(cfg, { reportsDir }); // maxRowErrors defaults to 0
    expect(imp.exitCode).toBe(1);
    const rule = imp.rules.find((r) => r.source === 'tblCustomers') as any;
    expect(rule.status).toBe('failed');
    expect(await targetRowCount(target, 'customers')).toBe(0); // rolled back
  });
});

describe('constraint violation (NOT NULL)', () => {
  it('a row that violates a target constraint is a collected RowError, not a halt', async () => {
    const legacy = await legacyFrom('null-email.sql');
    const cfg = makeCfg(legacy, target);
    await runReset(cfg);

    const imp = await runImport(cfg, { reportsDir, maxRowErrors: 5 });
    const rule = imp.rules.find((r) => r.source === 'tblCustomers') as any;
    expect(rule.status).toBe('partial');
    expect(rule.rowsWritten).toBe(2); // the two valid rows still land
    expect(rule.rowErrors).toHaveLength(1);
    expect(rule.rowErrors[0]).toMatchObject({ legacyPk: '2' });
    expect(rule.rowErrors[0].cause).toMatch(/email/i); // DB NOT NULL message
  });
});

describe('unknown-table', () => {
  it('halts (throws) when the dump has a table with no rule', async () => {
    const legacy = await legacyFrom('unknown-table.sql');
    const cfg = makeCfg(legacy, target);
    await runReset(cfg);

    await expect(runImport(cfg, { reportsDir })).rejects.toThrow(
      /tblAuditLog.*no rule|no rule.*tblAuditLog/,
    );
  });
});
