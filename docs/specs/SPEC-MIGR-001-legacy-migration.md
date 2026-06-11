# M4 — Legacy Migration: Parity-Validation CLI

**Status**: APPROVED

One Plane issue (`POS-MIGR-001`) tracking the M4 parity-validation work.

Full design: [`docs/superpowers/specs/2026-05-21-m4-legacy-migration-design.md`](../superpowers/specs/2026-05-21-m4-legacy-migration-design.md)
(that doc back-refs this issue via its `**Issue:** POS-MIGR-001` line).

Summary: standalone TypeScript CLI under `new-implementation/migration/`
(import + verify phases, declarative per-table rules, deterministic UUIDv5,
`legacy_id` join column, JSON/HTML parity report, Testcontainers e2e).
Success gate: zero unexplained mismatches against the frozen legacy .NET
dump; the same code is then the real cutover tool.
