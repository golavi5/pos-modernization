# Upgrade rehearsal — the three migrations of #86/#89 on pre-#86 data (2026-11-09)

Local rehearsal, **not staging**. Goal: know what the next deploy does to an existing database before it boots, since `DB_RUN_MIGRATIONS=true` applies them on startup.

## Method
1. Throwaway MySQL 8; `migration:run:prod` (all six migrations), then three `migration:revert` → the exact **pre-#86 schema** (3 applied, 3 pending: `DropLocationStockColumns`, `DropDuplicateLocationFkColumns`, `AddCompanyTimezone`).
2. Seed by SQL: 1 company + its `settings` row, 1 warehouse, 2 locations (`GEN` with `capacity = 500, current_stock = 12`; `AUX` with `0/0`), 2 `stock_movements` pointing at them.
3. `migration:run:prod` with the real CLI.
4. Boot the backend (`NODE_ENV=production`, `DB_RUN_MIGRATIONS=true`) on the upgraded database and call the endpoints these changes touched.

## Results
| Check | Result |
|---|---|
| All three migrations execute | ✅ no errors |
| Row counts before → after (warehouses / locations / movements / settings) | 1/2/2/1 → 1/2/2/1 |
| `warehouse_locations.warehouse_id` still links to its warehouse | ✅ both locations |
| `stock_movements.location_id` still links to its location (`OUT 3 → GEN`, `IN 9 → AUX`) | ✅ |
| Existing `settings` row gets the new column | ✅ `timezone = America/Bogota` |
| `capacity`, `current_stock`, `locationId`, `warehouseId` columns | ✅ all gone (0 left) |
| App boots on the upgraded DB, no errors in the log | ✅ `/health` OK |
| `settings`, `inventory/stock`, `inventory/movements`, `reports/sales/{by-period,summary}`, `reports/inventory/value-by-warehouse`, `reports/products/top-selling`, `reports/customers/report`, `sales/reports/{daily,summary}`, `products`, `customers?isActive=false` | ✅ 200 on all 12 |

Reverting (`down`) was exercised earlier on a clean database for each migration (columns come back; values do not).

## What this does **not** prove
- **Data is lost, by design:** the `capacity = 500` on `GEN` and `current_stock = 12` are gone after `DropLocationStockColumns`. Nothing in the app reads them any more, but check the real database first: `SELECT COUNT(*) FROM warehouse_locations WHERE capacity > 0 OR current_stock > 0;` and take a backup (`scripts/db-backup.sh`).
- **Scale and lock time** on a large `stock_movements` (the drop of `locationId` plus its FK may rebuild the table on older MySQL 8 minors). Today that table is small; re-check if the legacy import ever fills it.
- **Existing companies change behaviour:** report day boundaries move from UTC to `America/Bogota` (`AddCompanyTimezone`). Expected, but numbers by day will shift for historical data.

## Staging checklist (what remains for BACK-007 and BACK-008 to become DONE)
1. Backup, then the query above.
2. Deploy; confirm in the backend log that the three migrations ran once.
3. `SELECT companyName, timezone FROM settings;` — every company has a zone.
4. Smoke the same 12 endpoints with a manager token; open `/inventory`, the dashboard and Settings → Empresa.
