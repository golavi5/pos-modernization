# Staging run — migrations for BACK-007 and BACK-008 (2026-11-10)

Staging is the Coolify application `facturame_app_modern`, a compose stack built from `new-implementation/docker-compose.coolify.yml` with `DB_RUN_MIGRATIONS=true`. The run followed the staging checklist at the end of the [local rehearsal](2026-11-09-migrations-upgrade-rehearsal.md) and [`STAGING-ROLLBACK-RUNBOOK.md`](../../new-implementation/STAGING-ROLLBACK-RUNBOOK.md) §1. All times are UTC.

**Read this first: the staging database was empty.** The only rows were the bootstrap company, one user and the system roles. There were no warehouses, locations, movements or `settings` rows. So this run proves the migrations apply and the app works on the migrated schema in the real environment. It does **not** prove that existing data survives. That evidence is still the local rehearsal on seeded pre-#86 data (2026-11-09). The owner accepted this before the deploy.

## Before the deploy
- **Deployed release:** image tag `85fc0fd7` (2026-08-11). This is the rollback target. Its migrations folder matches the ledger.
- **Ledger:** `InitialSchema1781578985277`, `AddLegacyIdColumns1781600000000`. So **four** migrations were pending, not three. `AddOversellFlags1781700000000` (2026-08-12) had never reached staging either.
- **DB charset/collation:** `utf8mb4` / `utf8mb4_0900_ai_ci`.
- **Pre-flight:**
  - `SELECT COUNT(*) FROM warehouse_locations WHERE capacity > 0 OR current_stock > 0;` returned **0**, so nothing was lost by `DropLocationStockColumns`.
  - Row counts: warehouses 0, warehouse_locations 0, stock_movements 0, settings 0. Also companies 1, users 1, roles 6, user_roles 2.

## Backup
- `new-implementation/scripts/db-backup.sh` (sha256 matches the repo at `c6db69fe`), run from a `mysql:8.0` client container on the stack's network, per runbook §1.
- File: `pos_db_20261110-050829.sql.gz` (4.0 KB), in `~/pos-staging-backups/20261110/` on the VPS. The dump took 4 s, and `gzip -t` passed.
- Restored with `db-restore.sh` into a new scratch DB `pos_scratch` (same charset/collation, granted to the app user) in 19 s. All **16/16 tables** had the same row count as `pos_db`, and the scratch ledger was the same 2 rows.

## Deploy
- `main` at `bc901345`; the code is the same as `c6db69fe`, since #98 and #99 are docs-only. Coolify deployment `uplmqo9svi9ywcyyjutneyft` was queued at 05:13:00, and the new containers were started and healthy at 05:24:49.
- **Ledger after:** ids 3–6 are `AddOversellFlags1781700000000`, `DropLocationStockColumns1781800000000`, `DropDuplicateLocationFkColumns1781900000000`, `AddCompanyTimezone1782000000000`. Each appears **once**.
  - The backend log has no migration lines, because TypeORM query logging is off in production. It does show `Nest application successfully started`, the backend restart count is 0, and there are no errors. **The ledger is the evidence that each migration ran exactly once.**
- After the CORS fix (next paragraph), a second deploy of the same commit (`qais6vinwykigkif6elmknxw`, containers at 05:37) left the ledger at 6 rows, so nothing re-ran.

**Config issue found and fixed (not a migration problem).** The browser login failed its CORS preflight. Coolify's `CORS_ORIGINS` held the API's own domain instead of the frontend origin; it had changed during that morning's domain edits. The compose domain mapping was also swapped (`backend` ↔ `frontend`). Both were fixed in Coolify with the owner's approval and the app was redeployed. No code or schema was touched.

## Checks
| Check | Result |
|---|---|
| `/health` | 200 `{"status":"OK"}` |
| `/health/ready` | 200 `{"status":"ready","db":"up"}` |
| Frontend `/login` | 200 |
| `settings.timezone` column | `varchar(64) NOT NULL DEFAULT 'America/Bogota'` |
| `SELECT companyName, timezone FROM settings;` | `Mi Empresa · America/Bogota`. The row was created by the first `GET /settings` after the deploy, because there were none before, so it shows the column default, not a backfill. |
| `capacity`, `current_stock`, `warehouse_locations.warehouseId`, `stock_movements.locationId` in `information_schema` | **0** left; `warehouse_id` and `location_id` are still there |
| Row counts after the migrations, before any test data | warehouses 0, warehouse_locations 0, stock_movements 0, the same as before. Companies, users and roles are intact. |
| 9 endpoints with a **manager** token: `/settings`, `/inventory/stock`, `/inventory/movements`, `/reports/sales/by-period?period=daily`, `/reports/sales/summary`, `/reports/inventory/value-by-warehouse`, `/reports/products/top-selling`, `/reports/customers/report`, `/sales/reports/daily` | **200** on all 9 (3–99 ms) |
| Stock ledger on the migrated schema: 2 QA products created via `POST /products` with stock 7 and 3 | 2 `IN` movements, each linked `location_id` → location → `warehouse_id` → warehouse "Principal". `value-by-warehouse`: 2 products, 10 units, 6000 (= 10 × cost 600). |
| Browser `/inventory` | one row per product: `QA-STAGING-001 · 7`, `QA-STAGING-002 · 3`, matching the ledger; no console errors |
| Browser Settings → Empresa | changed to `America/Mexico_City` and saved, and the value **survived a reload**. Then set back to `America/Bogota`. Done with an admin session, because a manager gets 403 (see below). |
| Browser dashboard | renders the real API figures ($0 / 0 transactions on an empty DB); the 7-day chart ends on Tuesday, today in Bogotá; no console errors |

## Test data left on staging
- User `qa-manager@example.com` with the manager role. It had the admin role temporarily for the settings check, and that role was removed afterwards. The password exists only in the operator's scratch notes.
- Products `QA-STAGING-001` and `QA-STAGING-002`, their 2 `IN` movements, and the default warehouse and location their creation made.
- The scratch DB `pos_scratch` and its grant.

## Findings that are not regressions
- `PATCH /settings/company` is admin-only (`@Roles('admin')`), but the Settings page shows "Save changes" to a manager. The save fails with 403 and the page shows **no error**, so a manager sees a silent failure. This is a UX follow-up. RBAC behaves correctly.
- Staging had not been deployed since 2026-08-11, so it was three months behind `main`.
