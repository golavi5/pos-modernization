# M1–M3 — Production Cutover Readiness

**Status**: DRAFT
**Owner**: gandhi
**Created**: 2026-06-16
**Modules**: M1 INFRA (primary), M2 BACK, M3 FRONT
**Plane**: maps to M1 via `_modules.yml` (`SPEC-*-deploy*.md`)

---

## 1. Goal & cutover definition

Close the remaining gaps that block a **first production go-live** of the
modern POS (M1–M3) onto Coolify. The functional surface is complete — all 10
domain modules have CRUD + service + controller, the frontend redesign shipped,
and E2E specs exist. What remains is **deploy-correctness, multi-tenant safety,
and operational readiness**.

**Cutover is "done" when** a fresh Coolify deployment can: boot all three
services healthy, seed exactly one admin, log in, complete a sale, and run
back-office reports — with tenant data isolated and no placeholder/mock data in
any user-facing path. Validated by a full **staging dry-run** before touching
production.

This spec covers the *first* cutover (greenfield deploy). Legacy data migration
and gradual rollover are **M4** (`SPEC-MIGR-001`) and out of scope here.

---

## 2. Done — fixed in branch `fix/cutover-blockers-auth-tenant`

Commit `a95a2c4d`. Backend 158/158 unit tests pass; frontend type-checks clean.

| ID | Blocker | Resolution |
|----|---------|------------|
| B-01 | **Tenant data leak.** `reports`, `notifications`, `users`, `settings` controllers passed `user.companyId` — `undefined` (entity field is `company_id`) — so queries ran unscoped across all tenants. | Aligned all ~37 refs to `user.company_id`. |
| B-02 | **CORS broken.** Code read `CORS_ORIGIN`; env/docs use `CORS_ORIGINS` → fell back to `'*'` + `credentials:true` (browser-rejected). | Read `CORS_ORIGINS` (comma-split), never `'*'` with credentials. |
| B-03 | **JWT.** Hardcoded secret fallback; refresh signed with the access secret; `JWT_REFRESH_SECRET` never read. | Separate `JWT_REFRESH_SECRET`; prod env validation in `main.ts` makes dev fallbacks unreachable in prod. |
| B-04 | **Auth contract.** Frontend used snake_case (`access_token`); backend speaks camelCase (`accessToken`) with no mapping → token never reached the axios interceptor; refresh sent the wrong field; logout never cleared the cookie. | Aligned frontend types/store/refresh to camelCase; store the real token in the middleware cookie; clear on logout. |

---

## 3. Remaining blockers (must fix before go-live)

### B-05 — Production database initialization path  ✅ *DONE (TypeORM migrations)*
- **Decision:** adopted TypeORM migrations. The **initial migration is generated
  from the entities**, not from `database/schema.sql` — because the app provably
  runs on the entity schema (dev `synchronize:true`), while `schema.sql` is
  divergent (different table names: `categories`→`product_categories`,
  `warehouse`→`warehouses`; no `notifications` table at all) and, critically,
  declares several columns the app **writes to** as `GENERATED … STORED`
  (`order_items.subtotal`/`tax_amount`, `orders.remaining_balance`,
  `products.margin_percent`). A `schema.sql`-mirrored migration would reject the
  sale write path (MySQL error 3105). Generating from entities sidesteps that and
  guarantees the schema matches the running code.
- **Implementation:** `backend/src/database/data-source.ts` (shared
  `dataSourceOptions`, reused by the app and CLI; `synchronize:false`,
  `migrationsRun` gated on `DB_RUN_MIGRATIONS`); initial migration
  `database/migrations/*-InitialSchema.ts` (15 tables incl. the `user_roles`
  join); npm scripts `migration:generate|run|revert|run:prod`; `app.module.ts`
  consumes the shared options; Coolify runs migrations on boot via
  `DB_RUN_MIGRATIONS=true`; CI step fixed; `database/schema.sql` marked
  superseded; compose preload replaced with migrations-on-boot.
- **Verified** against a real MySQL 8: applies (15 tables + tracking row),
  idempotent re-run, **full sale-chain write succeeds in prod mode** (the
  generated-column risk), reverts cleanly, and `schema:log` shows **zero drift**
  between the migration and the entities. Unit suite 158/158.

### B-06 — Schema ↔ entity drift (residual, deferred)
- **Decision (from B-05):** production schema = **entity-derived**. The 8 designed
  tables no code uses yet — `permissions`, `role_permissions`,
  `customer_addresses`, `customer_contacts`, `audit_log`, `reports`,
  `transactions`, `invoices` — are intentionally **deferred** (grep confirmed no
  raw-SQL usage). Add each per-feature, with its entity, in a future migration.
- **Residual drifts worth fixing at cutover (not blockers):**
  - `products.sku` is **globally unique** (entity `unique:true`) rather than
    company-scoped (`uk_company_sku`) → two tenants can't share a SKU. Real
    multi-tenant constraint bug, pre-existing in the entity.
  - `customers.email` is `NOT NULL UNIQUE` in the entity — blocks customers
    without email / duplicate-email tenants.
  - Duplicate unique indexes on `users.email` and `settings.companyId` (named
    `@Index` + column `unique:true`); harmless, cosmetic.
- **Acceptance:** each deferred table either has an entity + migration or a
  documented reason; the sku/email constraints are decided (scoped vs global).

### B-07 — Mocked customer data in the sales path  ✅ *DONE*
- **Was:** `CustomerSelect.tsx` listed a hardcoded `mockCustomers` array
  (Juan Pérez, etc.) — selecting one attached a fake id to the sale.
- **Fix:** swapped to the real `useCustomers` hook with debounced (250 ms)
  server-side search + loading/empty/error states. The selection already flows
  `CustomerSelect → SalesCart → page.tsx (cart.customer_id) → createSale`, so the
  real `customer_id` now persists unchanged.
- **Also fixed (same path):** backend customer search used `ILIKE` (PostgreSQL)
  in `customers.service.ts` — invalid on MySQL, so search 500'd DB-wide.
  Changed to `LIKE` (case-insensitive under `utf8mb4_unicode_ci`).
- **Verified:** frontend `tsc` clean; backend 168/168; against real MySQL 8,
  `ILIKE` errors (1064) while `LIKE '%juan%'` matches `Juan Pérez`
  case-insensitively. (Full authed UI sale not run — no e2e harness here; the
  selection→`customer_id`→order wiring is unchanged and was traced.)

### B-08 — compose env files / PORT  ✅ *DONE*
- **Was:** `docker-compose.yml` referenced `env_file: ./backend/.env` and
  `./frontend/.env.local` (both absent) → `docker compose up` hard-failed on a
  missing-file parse error.
- **Fix:** made both `env_file`s `required: false` (Compose long-form) so a
  missing file is a clear runtime error (backend's prod env validation), not a
  parse failure; pinned `PORT=3000` explicitly in the backend `environment:`;
  added `DB_RUN_MIGRATIONS` to `backend/.env.example`; documented the one-time
  `cp .env.example` setup in the compose header + `CLAUDE.md`. Secrets stay
  out of git (`.env`/`.env.local` are gitignored; examples tracked).
- **Verified:** `docker compose config` parses with both env files absent;
  a real `docker compose up --build mysql backend` (test-only secrets) → both
  **healthy**, migrations ran on boot, `/health`→OK. (Frontend image build not
  exercised — its `NEXT_PUBLIC_API_URL` is build-arg baked, orthogonal to the
  env-file fix.)
- **Note:** the committed root `new-implementation/.env` (MySQL dev creds) is
  left in place so compose boots out-of-box; scrubbing it is tracked as **S-05**.

### B-09 — Frontend route role-based access control  ✅ *DONE*
- **Was:** `(panel)/layout.tsx` guarded only on `isAuthenticated`; roles existed
  but were unenforced — a cashier could open `/users` and `/settings`.
- **Fix:** central `lib/auth/roles.ts` policy (`ROUTE_ROLES`) mirroring each
  module's backend `@Roles` read access, plus an admin/superadmin bypass.
  `(panel)/layout.tsx` enforces it (redirect → `/dashboard`), gated on `user`
  being hydrated to avoid bouncing allowed users during Zustand rehydration.
  `Sidebar.tsx` hides nav items + the Settings link by role.
- **Verified (by logic, not test — no frontend unit runner):** cashier
  (`roles:['cashier']`) → `/users` and `/settings` both resolve to
  `['admin','manager']` → denied → redirected to `/dashboard`; keeps
  `/sales`/`/customers`/`/dashboard`/`/products`. Frontend `tsc --noEmit` clean.
- **Backend `RolesGuard` remains the real security boundary** — this is UX gating.
- **Deferred nicety:** edge-level (middleware) role gating to avoid a brief
  restricted-shell flash before client redirect. Low value (the shell renders no
  data — API 403s), real risk (edge JWT parsing + legacy non-JWT cookies). Not
  done by choice.

---

## 4. Should-fix before launch

| ID | Item | Evidence / note |
|----|------|-----------------|
| S-01 | **CI is broken & ungated** | `.github/workflows/e2e-tests.yml:53` runs `npm run typeorm migration:run` (script doesn't exist). Add lint + unit + build gates; align Node 18→20 (Dockerfiles use 20). |
| S-02 | **No observability** | Structured logging (Pino/Winston), error tracking (Sentry), richer `/health` (DB check). Backend `/health` exists; **frontend has none** — add one + a compose healthcheck for the frontend service. |
| S-03 | **No backup / rollback** | `DEPLOYMENT-COOLIFY.md` documents neither. Add `mysqldump` cron + restore + redeploy-rollback steps. |
| S-04 | **Weak seed / no bootstrap** | `seed-data.sql` ships `password123` admins. Add a first-run admin bootstrap (or documented secure-seed + forced password change); never seed demo users in prod. |
| S-05 | **Committed `.env`** | `new-implementation/.env` is tracked with no `.gitignore`. Add ignore + scrub history; rotate any real secret. |
| S-06 | **Weak password policy** | `auth.constants.ts`: `MIN_LENGTH:6`, all complexity off. Raise length, enable some complexity. |
| S-07 | **Reports zero test coverage** | No `reports/**/*.spec.ts`; the B-01 tenant bug went uncaught. Add tenant-scoping tests. |
| S-08 | **Service stubs** | `customers.service.getPurchaseHistory()` returns `[]`; `notification-scheduler.checkLowStock()` returns placeholder. Implement or hide the endpoints. |
| S-09 | **i18n gaps** | Hardcoded EN/ES strings on product detail/edit + category pages; align `es.json`/`en.json` keys. |
| S-10 | **Dead register token fields** | `types/auth.ts` `AuthResponse` still has snake_case token fields; backend register returns no tokens. Cosmetic — remove. |

---

## 5. Go-live runbook (staging dry-run gate)

Run the entire sequence on a **staging** Coolify instance; all steps green = go.

1. Provision MySQL (no exposed port); generate strong `DB_PASSWORD`.
2. Initialize schema via the **B-05** mechanism; load constraints; **no demo seed**.
3. Bootstrap one admin (**S-04**).
4. Deploy backend with full prod env (`JWT_SECRET`, `JWT_REFRESH_SECRET`,
   `CORS_ORIGINS`, …); confirm `validateProductionEnv()` passes and `/health` is green.
5. Deploy frontend (`NEXT_PUBLIC_API_URL` → backend domain); frontend healthcheck green.
6. **Smoke:** log in → complete a sale (≤4 clicks) → run a sales report →
   confirm a *second* tenant sees only its own data (**B-01** regression check).
7. Verify backup job runs and a restore succeeds (**S-03**).

---

## 6. Exit criteria

- [ ] B-05 … B-09 closed and verified in staging dry-run
- [ ] S-01 (CI green & gating) and S-05 (no committed secrets) closed
- [ ] Smoke + tenant-isolation checks pass on staging
- [ ] Backup + rollback demonstrated
- [ ] Remaining S-items triaged: fix-now vs fast-follow, each tracked in Plane

---

## 7. Out of scope

Legacy data migration & rollover (**M4** / `SPEC-MIGR-001`); fiscal platform
(**M5** / `SPEC-FISC-001`); the repo→"Automatizate" rename (OQ-5). Non-blocking
polish (pagination consistency, loading skeletons) tracked separately.
