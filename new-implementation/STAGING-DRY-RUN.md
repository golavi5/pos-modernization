# Staging Dry-Run — M1–M3 Production Cutover

Execute this **end-to-end on a staging Coolify instance** before touching
production. Every box must be checked (and its **pass gate** met) to sign off.
Detailed Coolify clicks live in [`DEPLOYMENT-COOLIFY.md`](./DEPLOYMENT-COOLIFY.md);
this is the verification checklist. Tracks SPEC-CUT-001 §5.

> A freshly migrated database contains **only the bootstrap admin** — no demo
> data. Catalog, customers, and any second tenant are **created during this run**.

---

## 0. Prerequisites
- [ ] Staging Coolify instance reachable; staging subdomains for `api.` and `app.`
- [ ] Repo access (`golavi5/pos-modernization`, branch `main`)
- [ ] Secrets generated (keep them only in Coolify env, never in git):
  ```bash
  openssl rand -base64 48   # JWT_SECRET
  openssl rand -base64 48   # JWT_REFRESH_SECRET
  openssl rand -base64 24   # DB_PASSWORD / MySQL password
  # BOOTSTRAP_ADMIN_PASSWORD: pick a strong value, min 12 chars
  ```

## 1. MySQL
- [ ] Provision Coolify MySQL 8.0; **port NOT exposed**; strong `DB_PASSWORD`.
- **Pass gate:** resource shows healthy; internal host/credentials noted.

## 2. Backend (NestJS)
- [ ] Deploy from `main`, Dockerfile `new-implementation/backend/Dockerfile`, port `3000`.
- [ ] Set env (see `backend/.env.example`): `NODE_ENV=production`, `PORT=3000`,
      `DB_*`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS=https://app.<domain>`,
      `DB_RUN_MIGRATIONS=true`, and `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`
      (+ optional `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_COMPANY_NAME`).
- **Pass gates (check the deploy logs):**
  - [ ] No `Missing/placeholder production env vars` error (`validateProductionEnv` passed).
  - [ ] Migration log on first deploy: `Migration InitialSchema… has been executed successfully`.
  - [ ] Bootstrap log on first deploy: `Bootstrapped admin user "<email>" (company "<name>")`.
  - [ ] Health is green:
    ```bash
    curl -s https://api.<domain>/health        # → {"status":"OK", ...}
    ```
  - [ ] Schema present (≈15 tables) — via Coolify DB console: `SHOW TABLES;`

## 3. Frontend (Next.js)
- [ ] Deploy from `main`, Dockerfile `frontend/Dockerfile`, port `3000` (public 3001-style), with
      build arg + env `NEXT_PUBLIC_API_URL=https://api.<domain>`.
- **Pass gates:**
  - [ ] App loads at `https://app.<domain>`; `/login` renders.
  - [ ] No CORS errors in the browser console on login (confirms `CORS_ORIGINS` matches).

## 4. Smoke — core flow
- [ ] **Login** as the bootstrap admin → lands on `/dashboard`.
- [ ] **Create catalog:** add a category + at least one product (Productos).
- [ ] **Complete a sale** (Ventas): add product → Cobrar → pay → success, in ≤4 clicks.
- [ ] **Attach a real customer:** create a customer, then on a new sale the
      customer selector **lists it** (real API, not mock) and search-by-name works
      (confirms the `ILIKE`→`LIKE` fix); the sale persists the real `customer_id`.
- [ ] **Reports:** run a sales report — totals reflect the sale just made.
- **Pass gate:** all of the above succeed with no 5xx in the network tab.

## 5. Smoke — security (RBAC + tenant isolation)
- [ ] **RBAC:** create a `cashier` user (Usuarios). Log in as that cashier →
      `/users` and `/settings` redirect to `/dashboard`; those nav items are hidden;
      `/sales` works. (Backend `@Roles` also 403s the APIs — check the network tab.)
- [ ] **Tenant isolation (B-01 regression):** as admin, create a **second company**
      + a user in it; add a product/sale under each company. Log in as the
      second-company user → its **reports/customers show only its own data**,
      never the first company's.
- [ ] **Privilege-escalation boundary (PR #24):** as a tenant `admin` (not superadmin):
      - `POST /companies` → **403** (company create/delete is `superadmin`-only).
      - `GET /users/roles/list` → the response **omits `superadmin`** (elevated roles
        are hidden from non-elevated actors).
      - `POST /users` or `PATCH /users/:id/roles` attempting to grant `superadmin`
        → **403** `You cannot assign an elevated role.` (admin cannot self-escalate or
        mint a superadmin).
- **Pass gate:** zero cross-tenant data visible; cashier cannot reach admin routes;
  a tenant admin cannot create a company or assign/see the `superadmin` role.

## 6. Backup / restore / rollback rehearsal
- [ ] **Backup:**
  ```bash
  mysqldump -h <db-host> -u <user> -p<pass> <db> | gzip > pos_$(date +%F).sql.gz
  ```
- [ ] **Restore** into a scratch DB and confirm row counts match:
  ```bash
  gunzip < pos_<date>.sql.gz | mysql -h <db-host> -u <user> -p<pass> <scratch_db>
  ```
- [ ] **Rollback rehearsal:** in Coolify, redeploy the previous backend image/commit;
      confirm the app comes back healthy (migrations are forward-only — a rollback
      must target a commit whose migrations already ran).
- **Pass gate:** restore verified; rollback returns a healthy stack.

## 7. Observability spot-check
- [ ] Backend logs are reachable in Coolify and show requests/errors.
- [ ] `/health` is wired to the Coolify healthcheck (auto-restart on failure).
- **Note:** structured logging / error tracking / DB-aware health are **S-02**
  (not yet done) — acceptable for a dry-run, schedule before heavy production load.

---

## Sign-off
- [ ] All sections green on staging.
- [ ] Decisions logged: which S-items (S-02 obs, S-03 backups automation, S-06
      password policy) are blocking go-live vs fast-follow.
- [ ] **Go / No-Go** recorded with date and operator.

> Known gaps that are **not** blockers but should be tracked: S-02 observability,
> S-03 automated backups/rollback docs, S-06 password policy, S-07 reports tests.
> See SPEC-CUT-001 §4.
