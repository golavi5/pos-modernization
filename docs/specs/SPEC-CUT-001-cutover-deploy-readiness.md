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

### B-05 — No production database initialization path  🔴 *the headline gap*
- **Evidence:** `backend/src/app.module.ts:28` sets `synchronize: false` in prod
  (correct), but there are **no migrations** (no `migrations/` dir, no
  `typeorm` npm scripts). `docker-compose.yml:22` loads `schema.sql` via
  `docker-entrypoint-initdb.d` **(dev MySQL only)**; the Coolify guide
  (`DEPLOYMENT-COOLIFY.md:249`) says "para producción … correr migrations" — a
  process that does not exist. `seed-data.sql` and `constraints-and-indexes.sql`
  are never run in any deploy path.
- **Impact:** fresh prod DB is empty → no tables → no login → system
  non-functional.
- **Fix (decision required):**
  1. **(Recommended)** Adopt TypeORM migrations: add `data-source.ts`, the
     `typeorm` + `migration:run` npm scripts, generate an initial migration
     from entities, run it on deploy (release step / container entrypoint).
     Becomes the long-term schema-change story.
  2. Or: document an explicit, ordered `schema.sql` → `constraints-and-indexes.sql`
     manual load step in the Coolify guide (faster, but no forward evolution path).
- **Acceptance:** a clean Coolify MySQL goes from empty → fully migrated by a
  documented, repeatable command; verified in the staging dry-run.

### B-06 — Schema ↔ entity drift
- **Evidence:** `database/schema.sql` defines ~21 tables; backend has ~14
  entities. Unmapped: `permissions`, `user_roles` (join, may be intentional),
  `role_permissions`, `customer_addresses`, `customer_contacts`, `audit_log`,
  `reports`.
- **Impact:** with `synchronize:false`, any code path touching an unmapped table
  fails at runtime; manual `schema.sql` load creates orphan tables with no ORM
  alignment.
- **Fix:** audit each — generate the entity, or confirm it's intentionally
  external (raw SQL / join-only) and document why. Resolve **before** B-05's
  initial migration is generated, so the migration is authoritative.
- **Acceptance:** entities and the initialized schema agree (a one-time
  `synchronize:true` against a scratch DB produces **no** diff).

### B-07 — Mocked customer data in the sales path
- **Evidence:** `frontend/components/sales/CustomerSelect.tsx` uses a hardcoded
  `mockCustomers` array, not the real customers API / `useCustomers`.
- **Impact:** attaching a customer to a sale won't match real records.
- **Fix:** replace mock with the real API hook; loading/empty states.
- **Acceptance:** customer selector lists DB customers; a sale persists the real
  `customer_id`.

### B-08 — `backend/.env` missing for compose; PORT inconsistency
- **Evidence:** `docker-compose.yml` references `env_file: ./backend/.env`
  (absent → `docker compose up` fails); `main.ts` default port now `3000`, but
  this must be explicit everywhere (Dockerfile `EXPOSE`, healthcheck, frontend
  `NEXT_PUBLIC_API_URL`).
- **Fix:** ship `backend/.env.example` → real `.env` for compose, or move vars
  into the compose `environment:` block; pin `PORT=3000` consistently.
- **Acceptance:** `docker compose up -d` boots all three services from a clean
  checkout + documented env.

### B-09 — Frontend route role-based access control
- **Evidence:** `frontend/app/(panel)/layout.tsx` guards only on
  `isAuthenticated`; roles (`admin`/`manager`/`staff`/`cashier`) exist but are
  unenforced — a cashier can open `/users` and `/settings`.
- **Impact:** privilege escalation in the UI (backend `@Roles` still guards the
  API, so this is UI exposure, not data breach — keep as blocker for go-live
  posture).
- **Fix:** role guard per route group; hide nav items by role.
- **Acceptance:** a cashier session cannot reach `/users` or `/settings`.

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
