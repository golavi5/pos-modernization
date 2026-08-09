# M4 — Legacy Migration: Parity-Validation CLI

**Status**: APPROVED — machine complete (`reset`/`import`/`verify`/`report`, 10 test files); real-dump parity NOT run. The committed e2e uses a synthetic fixture and does not prove the rules against `info/bd_ex.sql`. Five open items in the README "Known limitations & follow-ups"; per-row inserts (~14 min for 1.18M order_items) are called out there as the top cutover-readiness follow-up.
<!-- Advanced DRAFT -> APPROVED intentionally as part of the status-line
     audit (see PR that introduced the status-convention in CLAUDE.md): the
     CLI is machine-complete (see summary below), so DRAFT understated it.
     This moves the Plane column from Backlog to Ready on next sync — that
     is the intended effect, not a stale reversion of the earlier
     manually-parked-in-Backlog state. -->

One Plane issue (`POS-MIGR-001`) tracking the M4 parity-validation work.

Full design: [`docs/superpowers/specs/2026-05-21-m4-legacy-migration-design.md`](../superpowers/specs/2026-05-21-m4-legacy-migration-design.md)
(that doc back-refs this issue via its `**Issue:** POS-MIGR-001` line).

Summary: standalone TypeScript CLI under `new-implementation/migration/`
(import + verify phases, declarative per-table rules, deterministic UUIDv5,
`legacy_id` join column, JSON/HTML parity report, Testcontainers e2e).
Success gate: zero unexplained mismatches against the frozen legacy .NET
dump; the same code is then the real cutover tool.
