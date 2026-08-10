# Migration CLI — M4 Legacy Parity

Standalone TypeScript CLI that imports a legacy MySQL dump into the new POS
schema and verifies row-by-row parity. It is the real cutover tool once
`verify` reports zero unexplained mismatches.

---

## Prerequisites

- **Docker** running (dev MySQL at port `3308` via `docker compose up -d`).
- **Backend deps installed and built** — provisioning imports the backend's
  compiled TypeORM data-source (`backend/dist/database/data-source.js`). The
  `pretest` script handles this automatically, but for manual runs first do:

  ```bash
  cd new-implementation/backend && npm install && npm run build
  ```

- **Migration deps installed:**

  ```bash
  cd new-implementation/migration && npm install
  ```

- **Config in the environment.** The CLI reads `process.env` directly — there is
  no dotenv loader, so a `.env` file sitting in this directory does **nothing**.
  `.env.example` is documentation of the variable names; export them (or
  `set -a; . ./.env; set +a` yourself):

  ```bash
  export NODE_ENV=migration DB_HOST=127.0.0.1 DB_PORT=3308 \
         DB_USER=pos_user DB_PASSWORD='…' \
         TARGET_DB_NAME=pos_db_migration LEGACY_DB_NAME=pos_legacy
  ```

---

## Environment Variables

Names documented in `.env.example`; all required, all read from the process
environment (that file is never loaded — see Prerequisites):

| Variable | Default | Notes |
|----------|---------|-------|
| `NODE_ENV` | `migration` | Must be `migration`. Safety rail rejects any other value. |
| `DB_HOST` | `localhost` | MySQL host. |
| `DB_PORT` | `3308` | Dev MySQL (Docker). |
| `DB_USER` | `pos_user` | MySQL user. |
| `DB_PASSWORD` | _(empty)_ | Fill with your DB password. |
| `TARGET_DB_NAME` | `pos_db_migration` | Must end in `_migration`. |
| `LEGACY_DB_NAME` | `pos_legacy` | Legacy source schema. |

Both schemas live in the **same MySQL instance** — required for the
cross-schema verify JOIN.

---

## Commands

```bash
NODE_ENV=migration npm run migrate -- reset    # drop + recreate target DB via TypeORM migrations
NODE_ENV=migration npm run migrate -- import   # load legacy rows into target
NODE_ENV=migration npm run migrate -- verify   # field-by-field row diff; exit 1 if mismatches
NODE_ENV=migration npm run migrate -- report   # render latest JSON report → reports/<ts>/report.html
```

### What each command does

| Command | Description |
|---------|-------------|
| `reset` | Drops `TARGET_DB_NAME`, recreates it, then runs the backend's TypeORM migrations to provision the correct schema. Start here on each fresh run. |
| `import` | Streams legacy rows via declarative per-table rules (topological order). Idempotent — re-runs overwrite via `ON DUPLICATE KEY UPDATE`. |
| `verify` | Joins legacy and target on `legacy_id`; diffs mapped fields. Always completes (no early halt). Exit `0` = clean, `1` = mismatches, `2` = infra error. |
| `report` | Reads `reports/<latest>/report.json` and writes `report.html` (static, no JS). |

---

## Safety Rails

Two hard checks prevent accidental production writes:

1. **`NODE_ENV` must be `migration`** — `import` and `reset` refuse to run
   under any other value.
2. **Target DB name must end in `_migration`** — guards against pointing at
   `pos_db` (production) or any other live schema.

---

## How Provisioning Works

`reset` provisions the target by importing the backend's **compiled** TypeORM
data-source (`backend/dist/database/data-source.js`) and calling
`runMigrations()`. It does **not** load `database/schema.sql` — that file is
superseded (see design doc §11 Amendment). Running `npm test` auto-builds the
backend first via the `pretest` hook; for manual `migrate reset` runs, build
the backend manually (see Prerequisites).

---

## Fiscal Tables — Deferred to M5

All DIAN fiscal tables (`e_invoice_response`, `config_plemsi`,
`empresas_resoluciones`, `prefijos`, `documentos`, `payloads`,
`clientes_*` fiscal variants) are mapped with `kind: "skip"` rules. They are
not imported or verified in M4. Fiscal migration is deferred to M5 (Fiscal
Platform & Accounting Agent).

---

## Tests

```bash
cd new-implementation/migration
npm test          # builds backend, then runs vitest (Testcontainers e2e + unit)
npm run test:watch
```

The committed e2e uses a synthetic fixture (`tests/fixtures/legacy-sample.sql`)
with no real PII. It proves the migration machine is correct; it does **not**
prove the actual rules against the real dump. Real data parity is validated
via the runbook below.

---

## Real-Dump Runbook

Use this to validate parity against `info/bd_ex.sql` (the 232 MB legacy
dump — gitignored because it holds real customer data; never commit it). Run
locally after confirming `npm test` is green.

```bash
# 1. Load the real legacy dump into pos_legacy on the dev MySQL (port 3308).
#    The dump is from MySQL 5.7; strip the removed NO_AUTO_CREATE_USER sql_mode
#    token so it loads on MySQL 8.0.
#
#    LOAD AS root, NOT pos_user. The dump ends with a TRIGGER carrying
#    `DEFINER=root@%` (after_insert_encabmovs_update_cantinventarios, which CALLs
#    the `updatecant` procedure). Creating it as a non-SUPER user with binary
#    logging on fails with ERROR 1419 and mysql ABORTS the load at that line —
#    leaving `inventarios` and every later table missing. Check the exit code:
#    a `sed | mysql` pipeline reports the last command's status, so wrapping it
#    in anything that ends in `tail` will show 0 while the load has failed.
mysql -h127.0.0.1 -P3308 -uroot -p -e "CREATE DATABASE IF NOT EXISTS pos_legacy CHARACTER SET utf8mb4"
sed -e 's/,NO_AUTO_CREATE_USER//g; s/NO_AUTO_CREATE_USER,//g; s/NO_AUTO_CREATE_USER//g' ../../info/bd_ex.sql \
  | mysql -h127.0.0.1 -P3308 -uroot -p pos_legacy

# 2. Grant the migration user access to BOTH schemas — the compose `pos_user`
#    is scoped to `pos_db` only, and `verify` needs a cross-schema JOIN:
mysql -h127.0.0.1 -P3308 -uroot -p -e "
  CREATE DATABASE IF NOT EXISTS pos_db_migration CHARACTER SET utf8mb4;
  GRANT ALL PRIVILEGES ON \`pos_legacy\`.* TO 'pos_user'@'%';
  GRANT ALL PRIVILEGES ON \`pos_db_migration\`.* TO 'pos_user'@'%';
  FLUSH PRIVILEGES;"

# 3. Export the config. NOTE: nothing loads `.env` — the CLI reads `process.env`
#    directly (`src/core/targetDb.ts`, `src/commands/reset.ts`). `.env.example`
#    documents the variables; it is not read at runtime. Export them, or source
#    the file yourself:
export NODE_ENV=migration DB_HOST=127.0.0.1 DB_PORT=3308 DB_USER=pos_user \
       DB_PASSWORD='…' TARGET_DB_NAME=pos_db_migration LEGACY_DB_NAME=pos_legacy

# 4. Provision target + run full parity cycle. Tee the import: the clampNum
#    warnings are console-only and never reach report.json (see below).
npm run migrate -- reset
npm run migrate -- import 2>&1 | tee /tmp/import.log
npm run migrate -- verify
npm run migrate -- report
```

Open `reports/<latest>/report.html` to review mismatches. Iterate rule
transforms in `src/rules/` until `verify` exits `0`.

**Validated (2026-08-10, on the committed rules):** a full run against
`bd_ex.sql` (production: 2 companies, 267 customers, 30,276 products, 15 users,
255,955 orders, 1,185,238 order items, 0 payments) imports with **0 row errors**
and `verify` reports **0 mismatches / 0 missing / 0 errors** across all 7 rules
— parity across 1,471,753 rows. Measured on a dev box: import 11m43s,
verify 1m33s.

> The earlier green run (2026-06-30) was superseded: it predated `64622a1d`,
> which changed `order-items.rule.ts` and `products.rule.ts`, so it did not
> validate the rules as committed. Re-validate after **any** change under
> `src/rules/` — a report is only evidence for the code that produced it.
> The int32 lower-bound fix in that commit affects 0 rows in this dump
> (`SELECT COUNT(*) FROM encabezados_mov WHERE Cant = -2147483648` → 0).

**Parity green does not mean lossless.** `verify` re-applies the same clamps the
import does, so a clamped field compares `0 == 0` and can never surface as a
mismatch. The `clampNum` warnings are the only channel for that loss, they go to
**stdout only** (never to `report.json`), and the run above produced 8 — see the
tax-rate item under follow-ups.

---

## Constraint reconciliation (legacy → new)

The new schema enforces UNIQUE / NOT NULL constraints the legacy DB never had,
and real data violates several. These are handled deterministically (so `verify`
stays parity-consistent) — but they are **semantic changes** an operator should
be aware of:

- **`order_number`** (UNIQUE) — legacy `NumDocumento` repeats (6,617 dups, not
  unique even per company+doc-type). Disambiguated as `"<NumDocumento>-<IdEncab>"`.
- **`customers.email`** (UNIQUE, NOT NULL) — empties synthesized
  (`cliente-<id>@migrated.local`); real duplicates plus-addressed
  (`local+<id>@domain`).
- **`products.barcode`** (UNIQUE) — non-unique barcodes (53 dups) nulled (a
  non-unique barcode is not a valid identifier).
- **`products` numerics** — corrupt rows (barcodes mis-entered into
  `CantFisica`/`CostoPromedio`, junk `Iva`) overflow the tighter column types;
  out-of-range values clamped to 0, valid values (incl. negative stock) kept.
- **`created_at`** — legacy `clientes.FechaCreacion` is null/sentinel for every
  row; falls back to migration time.

## Known limitations & follow-ups

- **Two products lose their tax rate.** `inventarios` 12935 (`Iva=2140`) and
  28471 (`Iva=1900`) exceed `DECIMAL(5,2)` and clamp to **0% tax**. The column
  is a plain percentage everywhere else (24,087 rows at `19`; no other value
  above 19), so these are mis-keyed `19.00`/`21.40`, not a ×100 convention —
  and both are ordinary retail items. They migrate tax-exempt, and `verify`
  cannot flag it (it re-applies the clamp). **Needs an operator decision before
  cutover:** fix the two rows in the source, or special-case them in
  `products.rule.ts`. Re-run the cycle either way.
- **Scale / speed.** `import` does per-row `INSERT … ON DUPLICATE KEY UPDATE`
  and loads each table fully into memory first; the full 1.47M-row import takes
  ~12 min on a dev box (11m43s measured 2026-08-10; peak heap well under the
  6 GB ceiling). Batched multi-row inserts (with per-row fallback for error
  isolation) are the top cutover-readiness follow-up.
- **`report.json`'s `startedAt` is actually a finish time.** `src/cli.ts` builds
  it with `new Date().toISOString()` evaluated *after* the phase `await`
  resolves, and the report directory is stamped a moment later. Do not read run
  duration from consecutive report directories — they are end timestamps.
- **Dropped legacy fields aren't diffed.** `verify` only compares mapped fields,
  so unmapped columns (e.g. `encabezados_mov.Dcto`) are invisible to parity by
  construction. Intentional (line totals are tolerance-checked net of discount);
  confirm no business-critical field is silently dropped before cutover.
- **`customers` soft-delete.** `EsActivo=0` sets `deleted_at` but leaves
  `is_active=true` (a plain column, not auto-filtering). Inactive legacy
  customers migrate as active + soft-deleted.
- **`encabezados_pagodet` (payments) is empty** in the current dump, so the
  payments rule and `mapPaymentMethod` are unexercised on real data.
- **Namespace pin.** `MIGRATION_NAMESPACE` (`src/core/idMap.ts`) is frozen —
  never change it post-cutover or re-imports desync cross-table references.
