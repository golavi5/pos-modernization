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

## Progress

**Walking skeleton complete and green (51 tests).** The full machine —
`reset → import → verify → report`, idempotency, partial/failed/rollback row
handling, and the unknown-table halt — is proven end-to-end against real MySQL
(Testcontainers) via the `tblCustomers` parity seam. CLI + core (idMap, differ,
topo, reporter, provision, preflight, config guards) + rule contract + registry
are implemented and unit-covered. See `new-implementation/migration/README.md`.

**Remaining (blocked on the real dump — design §9 open question):** `products`,
`orders` (`tblSales`), `payments` rules + fixtures await the dump's actual table
and column names. `orders`/`payments` also need a `companies` + `users` seed
(FK targets). Streaming (server-side cursor) and `archive` rules are follow-ups.

**Coverage caveats (know before cutover):** (a) `verify` re-applies each field's
transform on both sides, so it proves **row completeness + DB round-trip
fidelity + idempotency**, *not* transform-logic correctness — a buggy transform
passes verify silently. Transform correctness is owned by the per-rule unit
tests (`*.rule.spec.ts`); both must be authored. The success gate's "zero
unexplained mismatches" therefore assumes correct transforms, it does not prove
them. (b) `cli.ts` (commander wiring + `loadConfig` env mapping) is the one
seam with no automated coverage — the e2e drives `run*()` directly.

## Decisions (supersede the design)

1. **Authoritative target schema = backend TypeORM migrations, not
   `database/schema.sql`.** The design (2026-05-21) predates SPEC-CUT-001 B-05,
   which made the entities/migrations authoritative and declared `schema.sql`
   historical/divergent. `reset` and the e2e provision the target by applying
   the migrations' `up()` SQL directly — validating parity against the schema
   production actually runs, not a dead artifact.
2. **`legacy_id` lives ONLY on the migration target, not the live schema**
   (supersedes design §3/§5). It is `verify`'s join key — migration
   scaffolding, not production schema — so keeping it off live keeps the parity
   test honest and touches zero runtime code. Cutover-time `legacy_id`-on-live
   (when importing into the real `pos_db`) is a separate, deliberate future
   migration, possibly reverted after cutover.
