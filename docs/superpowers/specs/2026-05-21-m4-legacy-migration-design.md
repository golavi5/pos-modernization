# M4 — Legacy Migration: Parity-Validation Design

**Issue:** POS-MIGR-001
**Status:** Approved

- **Spec ID:** 2026-05-21-m4-legacy-migration
- **Module:** M4 (MIGR) of SPEC-001
- **Status:** approved
- **Author:** Gandhi
- **Date:** 2026-05-21

## 1. Purpose

M4 proves that the new POS schema can losslessly represent everything in the
frozen legacy .NET POS database dump. Its deliverable is a reusable CLI that
runs two phases against a legacy SQL dump and the new MySQL schema:

1. **import** — load every legacy row into the new schema via declarative
   per-table rules.
2. **verify** — field-by-field row diff between legacy and migrated rows.

Success = the parity report shows zero unexplained mismatches and zero
unaccounted-for legacy rows. Until M4 passes, no real data migration runs;
once it passes, the same code is the real cutover tool.

## 2. Scope

In scope:
- A standalone TypeScript CLI under `new-implementation/migration/`.
- A second MySQL service (`mysql_legacy`) added to `new-implementation/docker-compose.yml`.
- Per-table mapping rules for every table found in the legacy dump.
- A row-by-row verification report (JSON + static HTML).

Out of scope:
- Live migration from a running production .NET system.
- Bidirectional sync or rollback after cutover.
- UI for triggering migration. M4 is CLI-only.
- The legacy `.sql` dump itself — that's an input, not part of this spec.

## 3. Inputs and assumptions

- Legacy source format: a **SQL dump file** (frozen artifact) placed at
  `new-implementation/migration/dumps/legacy.sql`. The file is gitignored.
- The dump's engine is assumed compatible with MySQL 8.0 ingestion. If the
  legacy stack used SQL Server, an upstream conversion step (e.g.,
  `mssql-to-mysql`) produces this file. That conversion is out of scope.
- The new schema in `new-implementation/database/schema.sql` is the target
  and is treated as authoritative — rules adapt to it, not the other way
  around.
- M4 runs against a **separate target database** (default name
  `pos_db_migration`), provisioned from the same `schema.sql` as the live
  `pos_db`. The live DB is never touched by M4. The migration target DB is
  recreated from scratch on each run via `migrate reset` so imports start
  from a clean schema.
- All migrated tables gain a nullable `legacy_id VARCHAR(64)` column with a
  unique index. This is a schema change owned by this spec and applied to
  `new-implementation/database/schema.sql` so live and migration targets
  share the same shape.

## 4. Architecture

A new top-level workspace, sibling to `backend/` and `frontend/`:

```
new-implementation/migration/
├── package.json                # standalone; deps: mysql2, commander, zod, chalk
├── tsconfig.json
├── dumps/.gitkeep              # actual legacy.sql is gitignored
├── src/
│   ├── cli.ts                  # commander entrypoint
│   ├── commands/
│   │   ├── reset.ts            # `migrate reset` (drop + recreate target DB)
│   │   ├── import.ts           # `migrate import`
│   │   ├── verify.ts           # `migrate verify`
│   │   └── report.ts           # `migrate report` (renders HTML)
│   ├── rules/
│   │   ├── _registry.ts        # imports all rules, exports map + topo order
│   │   ├── customers.rule.ts
│   │   ├── products.rule.ts
│   │   └── ...                 # one file per legacy table
│   ├── core/
│   │   ├── idMap.ts            # deterministic uuidv5 helper
│   │   ├── legacyDb.ts         # mysql2 client → pos_legacy (port 3309)
│   │   ├── targetDb.ts         # mysql2 client → pos_db_migration (port 3308)
│   │   ├── differ.ts           # field-by-field row diff
│   │   └── reporter.ts         # collects results → JSON + HTML
│   └── types/
│       ├── Rule.ts
│       └── Report.ts
├── reports/                    # output dir, gitignored
└── tests/
    ├── fixtures/
    │   ├── mini-legacy.sql
    │   ├── corrupt-dates.sql
    │   ├── orphan-sales.sql
    │   └── unknown-table.sql
    └── e2e.spec.ts
```

`docker-compose.yml` adds:

```yaml
mysql_legacy:
  image: mysql:8.0
  container_name: pos_mysql_legacy
  ports: ["3309:3306"]
  environment:
    MYSQL_ROOT_PASSWORD: ${LEGACY_ROOT_PASSWORD}
    MYSQL_DATABASE: pos_legacy
  volumes:
    - mysql_legacy_data:/var/lib/mysql
    - ./migration/dumps/legacy.sql:/docker-entrypoint-initdb.d/01-legacy.sql:ro
```

**Why standalone, not a NestJS module:** keeps migration code off the runtime
backend's import graph, so no admin endpoint or stray import can invoke
destructive migration logic against the production DB.

## 5. Rule contract

Every legacy table maps to exactly one rule file. The same rule object is
read by both `import` and `verify`.

```ts
// src/types/Rule.ts
export type Rule =
  | { kind: "map";     source: string; target: string;       fields: FieldMap[]; idMap: IdMap; dependsOn?: string[]; maxRowErrors?: number; }
  | { kind: "skip";    source: string; reason: string; }
  | { kind: "archive"; source: string; targetTable: string; /* raw JSON copy */ };

export type FieldMap = {
  from: string;                            // legacy column
  to: string;                              // new column
  transform?: (v: unknown, ctx: TransformCtx) => unknown;
  verify?: "exact" | "ignore" | { tolerance: number };
};

export type TransformCtx = {
  row: Record<string, unknown>;            // the full legacy row, for cross-field transforms
  rule: Rule;                              // the rule being applied
};

export type IdMap = {
  legacyKey: string;                       // legacy PK column
  newKey: "uuid-v4" | "deterministic";     // deterministic = uuidv5(NS, source + legacy_id)
};
```

Example:

```ts
// src/rules/customers.rule.ts
export default {
  kind: "map",
  source: "tblCustomers",
  target: "customers",
  idMap: { legacyKey: "CustomerID", newKey: "deterministic" },
  fields: [
    { from: "CustomerID",   to: "legacy_id",   verify: "exact" },
    { from: "FullName",     to: "name",        verify: "exact" },
    { from: "Email",        to: "email",       transform: (v) => String(v ?? "").toLowerCase().trim() },
    { from: "Phone",        to: "phone",       verify: "exact" },
    { from: "CreatedOn",    to: "created_at",  transform: parseDotNetDate },
    { from: "IsDeleted",    to: "deleted_at",  transform: (v) => v ? new Date() : null, verify: "ignore" },
  ],
} satisfies Rule;
```

Design decisions:
- **Deterministic UUIDv5** (namespace + `source + legacy_id`) is the default.
  Re-runs produce identical UUIDs → idempotent imports, and the `id_map` is
  derivable rather than persisted as truth.
- **`legacy_id`** column is added to every migrated table as nullable
  `VARCHAR(64)` with a unique index. Diffs join legacy → new on
  `legacy.<pk> = new.legacy_id`.
- **`verify: "ignore"`** migrates a field but exempts it from the parity
  diff (e.g., soft-delete representation changes shape).
- **Unknown legacy tables** halt the run unless an explicit `skip` rule
  exists — forces deliberate acknowledgement.

## 6. Execution model

### Ordering

`_registry.ts` declares dependencies via each rule's `dependsOn`. The runner
topologically sorts rules at startup. Cycles fail loudly with the cycle path
printed.

### Import

```
for each rule in topo-order:
  if kind=skip:    log + continue
  if kind=archive: copy raw JSON into migration_archive(source, legacy_id, raw_json)
  if kind=map:
    open transaction on target DB
    stream legacy rows with SELECT * FROM <source> (server-side cursor, batch 500)
    for each row:
      new_id = uuidv5(NAMESPACE, source + legacy_pk)
      transformed = applyFields(row, rule.fields)
      INSERT ... ON DUPLICATE KEY UPDATE (keyed on legacy_id)
    commit per-table
```

### Verify

```
for each rule of kind=map:
  SELECT l.*, n.*
  FROM legacy.<source> l
  LEFT JOIN target.<target> n ON n.legacy_id = l.<pk>
  stream → for each pair:
    if n is null:      RowResult = MISSING
    else:              RowResult = differ.compare(l, n, rule.fields)
```

The differ honors each field's `verify` mode (`exact`, `tolerance`,
`ignore`). Output is `RowResult { ok | missing | mismatch[fields] }`.

### Idempotency

`UNIQUE(legacy_id)` index per migrated table + `ON DUPLICATE KEY UPDATE`
means re-running `import` overwrites instead of duplicating. Combined with
deterministic UUIDs, the same row gets the same UUID across runs.

### Output

Each command writes a timestamped JSON report to `reports/<ts>/report.json`.
`migrate report` reads the latest JSON and emits `report.html` (single
static file, server-rendered template — no JS framework).

Exit codes:
- `0` — all rules passed
- `1` — at least one mismatch or missing row
- `2` — infrastructure error

### Safety rails

- `import` and `reset` refuse to run unless `NODE_ENV=migration` (a
  dedicated env, not `production`/`development`).
- Target DB connection string must point at a database whose name matches
  `/_migration$/` (default `pos_db_migration`). Wrong-DB protection.
- `migrate reset` drops and recreates the migration target DB from
  `database/schema.sql` before each import run, so imports always start
  clean.
- `--dry-run` flag on `import` runs every transform and emits the
  would-be-inserted rows to a JSONL file. No writes to target.

## 7. Error handling

Three failure buckets, each with a distinct policy.

### 7.1 Infrastructure (halt)

DB unreachable, dump file missing, target schema missing an expected column,
cyclic rule graph, unknown legacy table without a `skip` rule. Detected
before any transaction opens. CLI exits with code `2` and a one-line
diagnostic naming the cause.

### 7.2 Row-level during import (collect, don't halt)

A single legacy row that can't be transformed (e.g., `parseDotNetDate`
throws on a malformed string, a NOT-NULL target field receives null) is
wrapped in `RowError { rule, legacy_pk, field, cause }` and pushed to the
reporter. Per-table transaction continues so one bad row doesn't abort a
200k-row table.

After all rows in a table are processed:
- If `RowError` count > `--max-row-errors` (default `0`, configurable per
  rule via a `maxRowErrors` field on the rule), the table's transaction is
  **rolled back** and the rule is marked `failed`.
- Otherwise the transaction commits and the rule is marked `partial` with
  the error list attached.

Downstream rules whose `dependsOn` contains a `failed` rule are skipped and
marked `blocked_by_dependency`.

### 7.3 Verification mismatches (always collect, never halt)

`verify` is read-only. All mismatches accumulate. Exit code is non-zero so
CI fails, but the run completes so every mismatch is visible — not just the
first.

### Resumability

Because import is idempotent, recovery = fix the rule or the dump and rerun
`migrate import`. No "resume from rule 7" mode. Already-converged rules
become no-ops on the next run.

### Observability

All output goes through a single structured logger with fields
`{ rule, phase, legacy_pk?, level }`. The CLI prints a human-readable line;
the JSON report captures the full structured log so the HTML report can
render it.

## 8. Testing strategy

### 8.1 Rule unit tests (no DB)

Each `*.rule.ts` ships a sibling `*.rule.spec.ts`. Fixtures are plain
objects shaped like raw legacy rows. Tests apply `fields` and assert the
resulting target row plus the deterministic UUID. This is where transforms
get the bulk of their coverage. Fast.

### 8.2 Core unit tests

`differ`, `idMap`, `reporter` each get focused tests. Differ correctly
classifies `ok` / `missing` / `mismatch` with all three `verify` modes.
Deterministic UUIDs stable across runs. Reporter aggregates row results
into the expected JSON shape.

### 8.3 End-to-end pipeline (Testcontainers)

A hand-crafted `tests/fixtures/mini-legacy.sql` — ~50 rows across 5
representative tables (customers, products, sales, payments, one
`skip`-marked audit table). The test:
- Boots two MySQL containers via Testcontainers (legacy + target, target
  loaded from `database/schema.sql`).
- Runs `migrate import`.
- Runs `migrate verify`.
- Asserts: exit `0`, JSON report has 0 mismatches, every legacy row landed
  via `legacy_id` join.

### 8.4 Failure-mode golden tests

Companion mini dumps that deliberately violate things, each asserting the
exact report shape (not just exit code):
- `corrupt-dates.sql` — `parseDotNetDate` produces `RowError`s; table
  marked `partial`; dependents continue.
- `orphan-sales.sql` — a sale references a missing customer; rule for
  sales is marked `failed`; downstream `payments` is
  `blocked_by_dependency`.
- `unknown-table.sql` — dump contains a table with no rule; runner halts
  with exit `2`.

### Tooling

- `vitest` (matches the existing TS toolchain; faster than Jest for CLIs).
- `@testcontainers/mysql` for the two-DB e2e — same MySQL 8.0 image as
  production, so we don't drift.
- No mocking of `mysql2`. Tests hit real DBs. Mocking SQL is how
  migrations silently break.

### Not tested here

- The real legacy dump itself — that's covered by running `migrate verify`
  against it. The suite proves the *machine* is correct; the parity run
  proves the *data* is correct.

## 9. Open questions

None at design time. The following are deferred until the real dump arrives:

- Exact list of legacy tables and their PK column names (drives the rule
  files we author first).
- Whether the legacy dump uses any nonstandard collations or character sets
  that require connection-level overrides.

## 10. References

- `SPEC-001-pos-modernization.md` — module M4 declaration.
- `new-implementation/database/schema.sql` — ~~authoritative target schema~~
  **SUPERSEDED**, see Amendment §11.
- `CLAUDE.md` — stack overview and dev commands.

## 11. Amendment — 2026-06-29 (schema ownership)

The original design (2026-05-21) treats `database/schema.sql` as the
authoritative target schema. Since then (SPEC-CUT-001 B-05/B-06) the schema
is owned by **TypeORM migrations** (`backend/src/database/migrations/`),
generated from the entities. `schema.sql` is now explicitly marked
SUPERSEDED, "do not load on deploy," and **divergent** from the running
schema (e.g. `categories`→`product_categories`, `warehouse`→`warehouses`,
no `notifications` table). Validating parity against `schema.sql` would test
against a schema that does not match production. This amendment supersedes
every `schema.sql` reference in §3, §6, and §8.3.

**Authoritative target tables** (from entities): `companies`, `customers`,
`products`, `product_categories`, `orders`, `order_items`, `payments`,
`warehouses`, `warehouse_locations`, `stock_movements`, `users`, `roles`,
`settings`, `notifications`.

**A1 — Target provisioning.** The migration target DB (default
`pos_db_migration`) and the e2e Testcontainer target are provisioned by
**running the backend's TypeORM migrations**, not by loading `schema.sql`.
Mechanism: the standalone CLI imports the backend's exported
`dataSourceOptions` (`new-implementation/backend/src/database/data-source.ts`,
already documented as the single source of truth) and constructs a
`DataSource` with `host`/`port`/`database` overridden to point at the target,
then calls `runMigrations()`. This dependency runs migration→backend, the
opposite direction from the "Why standalone" rationale in §4 (which forbids
*backend importing migration code*), so the decoupling property is preserved.
`migrate reset` drops + recreates `pos_db_migration`, then runs migrations.

**A2 — `legacy_id` column.** The nullable `legacy_id VARCHAR(64)` + unique
index is added via a **new TypeORM migration** in
`backend/src/database/migrations/`, NOT by editing `schema.sql`. Caveat: that
migration is picked up by `migrationsRun` on the next production deploy
(`DB_RUN_MIGRATIONS=true`), so live `pos_db` also gains these columns — the
design's "shared shape" intent, but a production-touching change riding in on
M4. The column is scoped to tables with an actual legacy source, NOT all 14
(scope decided at plan-review).

**A3 — Real dump located (supersedes §9 "deferred").** The legacy dump
**exists** at `info/bd_ex.sql` (232 MB, gitignored, MySQL `utf8mb3_spanish_ci`)
— a **representative sample** of a Colombian POS + DIAN fiscal system, not the
frozen cutover extract. §9's "deferred until the dump arrives" is void. Real
per-table rules are authored now (Spanish→English): `clientes`→customers,
`inventarios`→products, `encabezados`→orders, `encabezados_mov`→order_items,
`encabezados_pagodet`→payments, `usuarios`→users, `empresas`→companies. The
DIAN fiscal subsystem (`e_invoice_response`, `config_plemsi`,
`empresas_resoluciones`, `prefijos`, `documentos`, `payloads`, fiscal `clientes_*`)
is **deferred to M5** via explicit `skip` rules (frozen dump ⇒ nothing lost).
All 47 legacy tables get a map or skip rule (runner halts otherwise).

**A4 — Verify colocation.** §6's verify JOIN (`legacy.<src> LEFT JOIN
target.<tgt>`) is impossible across two MySQL servers. Legacy (`pos_legacy`)
and target (`pos_db_migration`) run as **two schemas in one MySQL instance**;
verify fetches per-batch and compares in-memory (scales to the real extract).

**A5 — Tenancy & passwords.** Legacy `clientes`/`inventarios`/`usuarios` carry
no company → all rows assigned ONE `company_id` (single-tenant; the dump is one
merchant). `usuarios.Clave` is a .NET hash, not bcrypt → not migrated; users
reset on cutover.

Full task-by-task plan:
[`docs/superpowers/plans/2026-06-29-m4-legacy-migration.md`](../../superpowers/plans/2026-06-29-m4-legacy-migration.md).
