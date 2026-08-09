# M4 — Legacy Migration: Parity-Validation CLI

**Status**: APPROVED — machine complete (`reset`/`import`/`verify`/`report`, 10 test files); real-dump parity NOT run. The committed e2e uses a synthetic fixture and does not prove the rules against `info/bd_ex.sql`. Five open items in the README "Known limitations & follow-ups"; per-row inserts (~14 min for 1.18M order_items) are called out there as the top cutover-readiness follow-up.
<!-- DRAFT here encodes "manually parked in Backlog", not spec-drafting
     status: the board item was moved to Backlog by hand, and DRAFT is the
     only enum value Kairos infers as Backlog. The CLI itself is well past
     draft (see summary below) — do not "fix" this to APPROVED or
     IN_PROGRESS without first updating the Plane column, or the next sync
     will forward-transition it straight back out of Backlog. -->

One Plane issue (`POS-MIGR-001`) tracking the M4 parity-validation work.

Full design: [`docs/superpowers/specs/2026-05-21-m4-legacy-migration-design.md`](../superpowers/specs/2026-05-21-m4-legacy-migration-design.md)
(that doc back-refs this issue via its `**Issue:** POS-MIGR-001` line).

Summary: standalone TypeScript CLI under `new-implementation/migration/`
(import + verify phases, declarative per-table rules, deterministic UUIDv5,
`legacy_id` join column, JSON/HTML parity report, Testcontainers e2e).
Success gate: zero unexplained mismatches against the frozen legacy .NET
dump; the same code is then the real cutover tool.
