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

- **`.env` file** — copy and fill:

  ```bash
  cp .env.example .env
  # fill DB_PASSWORD at minimum
  ```

---

## Environment Variables

From `.env.example` — all required:

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

The committed e2e uses a synthetic fixture (`tests/fixtures/mini-legacy.sql`)
with no real PII. It proves the migration machine is correct; it does **not**
prove the actual rules against the real dump. Real data parity is validated
via the runbook below.

---

## Real-Dump Runbook

Use this to validate parity against `info/bd_ex.sql` (the 232 MB legacy
dump — gitignored because it holds real customer data; never commit it). Run
locally after confirming `npm test` is green.

```bash
# 1. Load the real legacy dump into pos_legacy on the dev MySQL (port 3308):
mysql -h127.0.0.1 -P3308 -upos_user -p -e "CREATE DATABASE IF NOT EXISTS pos_legacy CHARACTER SET utf8mb4"
mysql -h127.0.0.1 -P3308 -upos_user -p pos_legacy < ../../info/bd_ex.sql

# 2. Copy and fill .env (DB_PASSWORD at minimum):
cp .env.example .env

# 3. Provision target + run full parity cycle:
NODE_ENV=migration npm run migrate -- reset
NODE_ENV=migration npm run migrate -- import
NODE_ENV=migration npm run migrate -- verify
NODE_ENV=migration npm run migrate -- report
```

Open `reports/<latest>/report.html` to review mismatches. Iterate rule
transforms in `src/rules/` until `verify` exits `0`.
