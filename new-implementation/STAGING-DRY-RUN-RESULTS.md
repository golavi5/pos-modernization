# Cutover Dry-Run — Results (local prod-parity pre-flight)

**Date:** 2026-06-30 · **Operator:** Claude Code · **Verdict at run time: 🔴 NO-GO**

> **Update (same day):** the blocker below (**B-10**) was fixed via Option A —
> `admin` is now a superuser-within-tenant in `RolesGuard`. Re-verified live:
> admin now creates a category, a product, and **completes a sale** (all `201`,
> previously `403`); the `superadmin` boundary is preserved (admin still `403`
> on `POST /companies`). Unit suite 190/190 (incl. a new `roles.guard.spec.ts`).
> Verdict for the *app-level* gates is now **GO**; full GO still requires the
> Coolify-only gates (bottom of this doc) on a real staging instance.

> **Scope caveat.** Coolify staging was not reachable from this environment, so
> this was run as a **local prod-parity pre-flight** via a self-contained
> compose stack (`NODE_ENV=production`, `DB_RUN_MIGRATIONS=true`, fail-fast
> secret validation, no demo seed — identical app config to a Coolify deploy).
> It exercises every **app-level** gate in `STAGING-DRY-RUN.md`. It does **not**
> close the Coolify-only gates (real `app.`/`api.` subdomain CORS, MySQL
> port-not-exposed, rollback-by-redeploy, Coolify healthcheck/observability).
> Ephemeral throwaway secrets were used; nothing was committed to git.

---

## ✅ Blocker — B-10: fresh DB has no operational roles — RESOLVED (Option A)

> **Fix applied:** `RolesGuard` now treats `admin` as a superuser for
> operational routes — it satisfies any `@Roles` it does not literally hold,
> **except** routes requiring an `ELEVATED_ROLES` member (`superadmin`), where
> literal membership still applies. This unblocks catalog/sale for the bootstrap
> admin without granting tenant admins platform-level powers (company
> create/delete stay `superadmin`-only). Covered by `roles.guard.spec.ts` (8
> cases) + live re-verification. Original analysis retained below for the record.



A freshly migrated + bootstrapped database contains **only the `admin` role**.
`BootstrapService` creates one company + the `admin` role + the admin user and
nothing else; **no code path anywhere creates or assigns `manager`,
`cashier`, or `inventory_manager`** (verified: bootstrap, `/auth/register`
[`auth.service.ts:119` → `roles: []`], `POST /users` [assigns existing role IDs
only], `PATCH /users/:id/roles` [assigns existing roles only]; `RolesGuard` has
**no** admin-superuser override).

Consequence — the runbook's **§4 core smoke flow is impossible as written**
(`STAGING-DRY-RUN.md` §4: *"Login as the bootstrap admin → add a category +
product → complete a sale"*):

| Action as bootstrap admin | Required role | Result |
|---|---|---|
| `POST /products/categories` | `manager` | **403** `does not have required role(s): manager` |
| `POST /sales/orders` (complete a sale) | `cashier`, `manager` | **403** `does not have required role(s): cashier, manager` |
| Assignable roles (`GET /users/roles/list`) | — | only `admin` |

The checklist author assumed the admin can run catalog/sale ops; the code gates
say it can't. This is an **app-level defect that transfers verbatim to real
Coolify staging** — it is not an artifact of the local substitution.

**Recommendation (design call — not auto-applied):**
- **Option A (makes §4 pass as written):** treat `admin` as a superuser in
  `RolesGuard` (admin satisfies any `@Roles`). One-line change; matches the
  "≤4 clicks" intent.
- **Option B:** seed `manager`/`cashier`/`inventory_manager` in
  `BootstrapService`. *Insufficient alone* — admin is still 403'd on sales, so
  the operator must create+assign a cashier and re-login (breaks "≤4 clicks").
- Recommended: **A** (optionally + B so staff roles are assignable out of the
  box). Track as **B-10** in `SPEC-CUT-001 §3` once the direction is chosen.

---

## ✅ Gates that passed

| Gate | Evidence |
|---|---|
| Secrets validation (`validateProductionEnv`) | Clean boot, no placeholder/missing-env error |
| Migrations on empty DB (B-05) | `InitialSchema…`, `AddLegacyIdColumns…` recorded in `typeorm_migrations`; 15 domain tables |
| First-run admin bootstrap (S-04) | Log `Bootstrapped admin user "admin@dryrun.local"`; DB shows admin user + `admin` role + company; restart → no second admin |
| `/health` | `{"status":"OK"}` |
| CORS (B-02) | `Access-Control-Allow-Origin: http://localhost:3001` + `…Credentials: true` — specific origin, never `*` |
| Auth token contract (B-04) | Login returns camelCase `accessToken`/`refreshToken`; JWT carries `roles:['admin']` |
| Customer create + search (ILIKE→LIKE) | `POST /customers` → 201; `GET /customers/search?search=mar` → matches "María Pérez" |
| Frontend serves | `/login` → HTTP 200, renders title + password field; healthcheck green |
| Backup / restore (S-03) | `mysqldump --single-transaction \| gzip` → restore into scratch DB → row counts match (users/companies/roles/customers = 1/1/1/1) |

## ⚠️ Blocked by B-10 (not independently testable on a fresh DB)
- §4 catalog + sale + sale-reflected-in-reports
- §5 tenant isolation positive path (needs per-company products/sales)
  — note: `@Roles` enforcement itself is **proven working** (the 403s above).

## ⏳ Coolify-only — still pending real staging
- Subdomain CORS against real `app.`/`api.`; MySQL port-not-exposed;
  rollback-by-redeploy rehearsal; Coolify healthcheck + observability (S-02).

---

## Go / No-Go
**NO-GO for production cutover.** Resolve **B-10** (role provisioning), then
re-run the full sequence on a real Coolify **staging** instance to close the
remaining exit criteria before `SPEC-CUT-001` can flip to DONE.

---

## Local backup/restore rehearsal

**Date:** 2026-07-09 · **Operator:** Claude Code · **Scope:** exercise
`scripts/db-backup.sh` + `scripts/db-restore.sh` end-to-end against a MySQL
8.0 stack (SPEC-CUT-002 non-infra prep). ✅ **PASS — restore verified,
row counts and per-table checksums match; no script bugs found.**

> **Substitution note.** Run against a standalone `mysql:8.0` container
> (`rehearsal-db`) with a **representative seeded dataset**, not a full
> app-boot. This isolates the backup/restore *mechanics* (mysqldump → gzip →
> gunzip → mysql, cross-DB) without building the backend image or minting
> secrets. The scripts are schema-agnostic, so a representative multi-table
> set proves the same code paths as the prior full-stack S-03 check
> (users/companies/roles = 1/1/1). No host `mysql`/`mysqldump` client exists,
> so both scripts ran inside a `mysql:8.0` client container joined to the DB's
> docker network.

### Commands run

```bash
# 1. Standalone MySQL + seed a representative dataset (as root)
docker network create posrehearsal
docker run -d --name rehearsal-db --network posrehearsal \
  -e MYSQL_ROOT_PASSWORD=rootpw -e MYSQL_DATABASE=pos_db \
  -e MYSQL_USER=pos_user -e MYSQL_PASSWORD=secretpw mysql:8.0
# seed companies/roles/users/customers/products with known counts (2/3/2/4/3),
# create empty pos_scratch, GRANT pos_user on pos_db.* and pos_scratch.*

# 2. Backup — the real script, in a client container on the DB network
docker run --rm --network posrehearsal \
  -v "$PWD/scripts:/scripts:ro" -v "$BACKUP_DIR:/backups" \
  -e DB_HOST=rehearsal-db -e DB_PORT=3306 -e DB_USERNAME=pos_user \
  -e DB_PASSWORD=secretpw -e DB_NAME=pos_db -e BACKUP_DIR=/backups \
  -w /scripts mysql:8.0 bash db-backup.sh
# → Backup written: /backups/pos_db_20260709-034531.sql.gz (4.0K)

# 3. Restore into the pre-created scratch DB — the real script
docker run --rm --network posrehearsal \
  -v "$PWD/scripts:/scripts:ro" -v "$BACKUP_DIR:/backups" \
  -e DB_HOST=rehearsal-db -e DB_PORT=3306 -e DB_USERNAME=pos_user \
  -e DB_PASSWORD=secretpw -e DB_NAME=pos_scratch -e CONFIRM=yes \
  -w /scripts mysql:8.0 bash db-restore.sh /backups/pos_db_20260709-034531.sql.gz
# → Restored 'pos_scratch' from /backups/pos_db_20260709-034531.sql.gz
```

### Result — source (`pos_db`) vs restored (`pos_scratch`)

| Table | Source rows | Restored rows | `CHECKSUM TABLE` match |
|---|---|---|---|
| companies | 2 | 2 | ✅ (2594916727) |
| roles | 3 | 3 | ✅ (4231426328) |
| users | 2 | 2 | ✅ (1088811489) |
| customers | 4 | 4 | ✅ (2443462279) |
| products | 3 | 3 | ✅ (3741109840) |

Row counts **and** per-table checksums are identical across all five tables —
the restore is byte-faithful, not merely row-count-equal.

### Findings / script health

- **No bugs found** — `db-backup.sh` and `db-restore.sh` ran unmodified.
  `--single-transaction --no-tablespaces --routines --triggers --events`
  dumped cleanly under a scoped `pos_user` (no `PROCESS`/global-privilege
  errors), confirming the MySQL-8 flag choices are correct.
- **Observed contract (not a bug):** `db-restore.sh` does **not**
  `CREATE DATABASE` — the dump is single-schema (no `--databases`), so the
  target must already exist. This matches the script header ("Restore into a
  SCRATCH database first") and the destructive-overwrite guard; the operator
  creates the scratch DB before restoring. Left as-is intentionally.

### Still pending (Coolify-only, out of scope tonight)
- Rollback-by-redeploy rehearsal (§6 of `STAGING-DRY-RUN.md`) — needs a live
  Coolify instance and forward-only migration history.
