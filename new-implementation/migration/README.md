# M4 — Legacy Migration: Parity-Validation CLI

`POS-MIGR-001` · design: [`docs/specs/.../2026-05-21-m4-legacy-migration-design.md`](../../docs/superpowers/specs/2026-05-21-m4-legacy-migration-design.md)

Validates that the frozen legacy .NET POS dump maps completely and faithfully
into the new schema, then becomes the real cutover tool. Standalone TypeScript
CLI — kept off the runtime backend's import graph so no stray import can run
destructive migration logic against production.

> **What `verify` does and does not prove.** `verify` re-applies each field's
> transform to the legacy value and compares it to what landed in the target.
> So it catches **missing/extra rows, DB round-trip corruption** (truncation,
> charset, precision/type drift) and **untransformed-field** errors. It does
> **not** catch a *wrong transform* — both sides run the same code, so a buggy
> transform passes verify silently. **Transform correctness is owned by the
> rule unit tests** (`*.rule.spec.ts`), not verify. Author both.

## Phases

| Command | What it does |
|---------|--------------|
| `migrate reset`  | Drop + recreate the target DB, apply the **authoritative backend TypeORM migrations**, add the `legacy_id` join column. |
| `migrate import` | Load legacy rows into the target via the rule registry (idempotent upsert keyed on `legacy_id`). |
| `migrate verify` | Read-only field-by-field parity diff, legacy ↔ target. Collects every mismatch. |
| `migrate report` | Render `report.html` from the latest `report.json`. |

Exit codes: `0` all pass · `1` mismatch/missing/failed rule · `2` infrastructure halt.

## Run

No Node on the host — everything runs in Docker.

```bash
# tests (unit + e2e). e2e boots real MySQL via Testcontainers.
./scripts/test-in-docker.sh          # all
./scripts/test-in-docker.sh src      # unit only (fast, no containers)

# a real parity run, once migration/dumps/legacy.sql exists:
docker compose --profile migration up -d mysql_legacy   # legacy on :3309
cp .env.example .env                                     # set NODE_ENV=migration etc.
npm run migrate -- reset
npm run migrate -- import
npm run migrate -- verify && npm run migrate -- report
```

## Key design decisions

- **Authoritative schema = backend TypeORM migrations, not `database/schema.sql`**
  (per SPEC-CUT-001 B-05; `schema.sql` is historical/divergent). `reset` and the
  e2e provision the target by applying the migrations' `up()` SQL directly
  (`src/core/provision.ts`) — self-contained, drift-free.
- **`legacy_id` lives ONLY on the migration target**, not the live schema. It is
  `verify`'s join key (migration scaffolding), not production schema. This
  **supersedes design §3/§5**, which predates B-05 and would have put it on the
  shared schema. Cutover-time `legacy_id`-on-live is a separate future step.
- **Safety rails** (`src/core/config.ts`): write commands refuse to run unless
  `NODE_ENV=migration` **and** the target DB name ends in `_migration`. The
  target shares the MySQL server with live `pos_db` — these guards are
  load-bearing.
- **Deterministic UUIDv5** (`source + legacy_id`) → idempotent re-imports.

## Status

Walking skeleton **complete and green** (51 tests): the full machine
(reset → import → verify → report, idempotency, partial/failed/rollback,
unknown-table halt) is proven against the real backend migrations via the
`tblCustomers` seam.

**Blocked on the real dump** (design §9 open question): only `customers` has a
rule. `products` / `orders` (`tblSales`) / `payments` rules — and their
fixtures — are authored once the dump's actual table + column names are known.
`orders`/`payments` additionally need a `companies` + `users` seed (FK targets).
Streaming (server-side cursor, batch 500) and `archive` rules are follow-ups.
