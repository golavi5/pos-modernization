# M2 — RBAC Role Provisioning & Ghost-Role Cleanup

**Status**: DRAFT
**Owner**: gandhi
**Created**: 2026-07-07
**Modules**: M2 BACK
**Plane**: maps to M2 (default) via `_modules.yml`

---

## 1. Goal

Make the role model **operable on a fresh deploy**: define/seed the roles the
app actually gates on, give an admin a way to provision staff with real roles,
and reconcile the "ghost" role names referenced in `@Roles(...)` but never
defined. Surfaced by the cutover dry-run while fixing **B-10** (see
`../../new-implementation/STAGING-DRY-RUN-RESULTS.md` and
`SPEC-CUT-001` §3 B-10).

## 2. Findings (from the dry-run)

1. **Only `admin` is ever created.** `BootstrapService` seeds one company +
   `admin` + the admin user. No path creates or assigns `manager`, `cashier`,
   or `inventory_manager` (`/auth/register` → `roles:[]`; `POST /users` and
   `PATCH /users/:id/roles` assign **existing** roles only). B-10 unblocked the
   admin via a superuser bypass in `RolesGuard`, but **staff roles still don't
   exist to assign** — a company can't onboard a cashier/manager.
2. **Ghost roles.** `superadmin`, `staff`, `viewer` appear in controller
   `@Roles(...)` decorators but are **not** in `AUTH_CONSTANTS.ROLES` and are
   never seeded. Consequence: `POST`/`DELETE /companies` (guarded by
   `@Roles('superadmin')`) are **unreachable by anyone** → no API path to
   provision or delete a second tenant. This is a real multi-tenant onboarding
   gap, currently masked because no one can hold `superadmin`.
3. **Role names as strings.** Roles are matched by `role.name`; the canonical
   set lives in `AUTH_CONSTANTS.ROLES` (`admin`, `manager`, `cashier`,
   `inventory_manager`, `accountant`) but `superadmin`/`staff`/`viewer` are used
   in decorators outside that set — no single source of truth.

## 3. Proposed scope (decide during design)

- **Seed the standard roles per company** (or as system roles): at least
  `manager`, `cashier`, `inventory_manager` so `POST /users` / `PATCH
  /users/:id/roles` have real targets. Bootstrap and/or a migration.
- **Reconcile ghost roles:** either (a) add `superadmin` (+ `staff`/`viewer` if
  kept) to `AUTH_CONSTANTS.ROLES` and seed a platform-level `superadmin`, or
  (b) replace `@Roles('superadmin')` on company provisioning with a defined
  role. Decide whether tenant creation is a **platform** op (superadmin) or an
  admin op.
- **Single source of truth:** every string in a `@Roles(...)` decorator must
  exist in the canonical role set; add a guard/test that fails CI on drift.
- **Keep the B-10 boundary:** whatever is chosen, `ELEVATED_ROLES` in
  `RolesGuard` must stay consistent (admin ≠ superadmin).

## 4. Acceptance

- [ ] A fresh deploy can onboard a `manager` and a `cashier` through the API
      (roles exist + assignable), verified end-to-end.
- [ ] Every `@Roles(...)` string resolves to a defined, seedable role; a test
      asserts no decorator references an unknown role.
- [ ] Tenant provisioning (`POST`/`DELETE /companies`) is reachable by a defined
      role, with the platform-vs-tenant boundary decided and documented.
- [ ] `RolesGuard` `ELEVATED_ROLES` reconciled with the final role set;
      `roles.guard.spec.ts` updated.

## 5. Out of scope

Coolify staging execution (`SPEC-CUT-002`); frontend role UX (B-09, done);
per-permission (fine-grained) authorization — the deferred `permissions` /
`role_permissions` tables (`SPEC-CUT-001` B-06) are a separate future effort.

## 6. References

- `../../new-implementation/STAGING-DRY-RUN-RESULTS.md` — B-10 analysis.
- `SPEC-CUT-001-cutover-deploy-readiness.md` §3 B-10.
- `../../new-implementation/backend/src/modules/auth/guards/roles.guard.ts`
  — `ELEVATED_ROLES` boundary.
- `../../new-implementation/backend/src/modules/auth/constants/auth.constants.ts`
  — canonical `ROLES`.
