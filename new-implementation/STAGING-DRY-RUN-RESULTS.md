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
