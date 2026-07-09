# RBAC Role Provisioning & Ghost-Role Cleanup — Design

**Issue:** POS-BACK-001
**Status:** Draft
**Date:** 2026-07-07
**Author:** gandhi (with Claude)
**SPEC:** `docs/specs/SPEC-BACK-001-rbac-role-provisioning.md`

---

## 1. Problem

The cutover dry-run (while fixing B-10) showed the role model is not operable on
a fresh deploy:

- **Only `admin` is ever seeded.** `BootstrapService` creates one company +
  `admin` + the admin user. Nothing creates or assigns `manager`, `cashier`,
  `inventory_manager`, `accountant`. B-10's `RolesGuard` admin-superuser bypass
  unblocked the admin, but staff roles still don't **exist to assign**, so a
  company can't onboard a cashier/manager.
- **Ghost roles.** `superadmin`, `staff`, `viewer` appear in `@Roles(...)` but
  are not in `AUTH_CONSTANTS.ROLES` and are never seeded. `POST`/`DELETE
  /companies` (guarded by `@Roles('superadmin')`) are therefore unreachable by
  anyone → no tenant provisioning path.
- **No single source of truth** for role-name strings — decorators reference
  names outside the canonical set with nothing catching the drift.

## 2. Decisions (locked)

1. **Seeding:** idempotent boot sync — upsert missing system roles on **every**
   startup, independent of the empty-DB bootstrap gate (fixes fresh *and*
   already-deployed DBs).
2. **Tenant provisioning:** define + seed `superadmin` as a real platform role;
   the first bootstrap admin also receives it. Keeps the platform-vs-tenant
   boundary — regular tenant admins still cannot create/delete companies.
3. **Ghost roles:** remove `staff`/`viewer` from the decorators (nothing seeds
   or assigns them; YAGNI). Routes keep their real roles.

Constraint that shapes the design: `Role.name` is **globally unique**, so roles
are system-wide (`company_id: null`, `is_system_role: true`) — not per-company.

## 3. Canonical role catalog (single source of truth)

`SYSTEM_ROLES`: an ordered list of `{ name, description }` for the six roles —
`superadmin`, `admin`, `manager`, `cashier`, `inventory_manager`, `accountant`.
`AUTH_CONSTANTS.ROLES` gains `SUPERADMIN: 'superadmin'`. Co-located with the
existing role constants so decorators, the seeder, and the drift test all read
one definition.

## 4. Components

### 4.1 `SystemRolesService.ensureSystemRoles()`
- Idempotent: for each entry in `SYSTEM_ROLES`, find by `name`; create only if
  absent (`is_system_role: true`, `company_id: null`). Never duplicates, never
  mutates an existing row.
- Resilient: wrapped so a hiccup logs and does not crash boot (mirrors
  `BootstrapService`'s posture).
- Returns a `Map<name, Role>` for callers that need the row (bootstrap).

### 4.2 `BootstrapService` (modified)
- Injects `SystemRolesService`; calls `ensureSystemRoles()` **first,
  unconditionally**, before the `userCount > 0` early return — so system roles
  are reconciled on every boot, including already-bootstrapped DBs.
- On an empty DB, the bootstrap admin user is created with **both** `admin` and
  `superadmin` (platform operator on first deploy). Reuses the rows returned by
  `ensureSystemRoles()` instead of creating the `admin` role inline.
- Subsequent admins (via `POST /users`) receive only the roles explicitly
  assigned — they do **not** inherit superadmin.

### 4.3 `RolesGuard` (no logic change)
- `ELEVATED_ROLES = ['superadmin']` already excludes superadmin routes from the
  admin bypass. With superadmin now seeded, a superadmin user passes those
  routes by literal membership. Comment refreshed to note superadmin is real.

### 4.4 Decorator cleanup
- Remove `'staff'` from `@Roles('admin','manager','staff')` (7 routes) and
  `'viewer'` from `@Roles('admin','manager','cashier','viewer')` (2 routes).
  Real roles are unchanged; behaviour is identical since no user ever held the
  removed names.

### 4.5 Drift-guard test
- A jest test walks `src/**/*.controller.ts`, regex-extracts every quoted name
  inside `@Roles(...)`, and asserts each ∈ the canonical set. Fails on any
  future decorator referencing an undefined role.

## 5. Data flow

```
boot
 └─ SystemRolesService.ensureSystemRoles()      # upsert 6 system roles (always)
     └─ BootstrapService (users table empty?)   # first deploy only
         └─ create company + admin user [admin, superadmin]
admin  → POST /users {roleIds:[manager|cashier]}    # roles now exist to assign
super  → POST/DELETE /companies                      # tenant provisioning reachable
```

## 6. Error handling

- `ensureSystemRoles` and the bootstrap block each catch-and-log; boot never
  crashes on a seeding hiccup (state stays retryable by restart).
- `POST /users` / `assignRoles` already 404 on unknown role IDs — unchanged.

## 7. Testing

- **`SystemRolesService` spec:** creates missing roles on an empty repo; second
  call is a no-op (idempotent, no duplicates); pre-existing roles are left
  untouched.
- **`BootstrapService` spec (updated):** calls `ensureSystemRoles`; the
  bootstrap admin is assigned both `admin` and `superadmin`.
- **`RolesGuard` spec (extended):** a superadmin user passes a `@Roles('superadmin')`
  route (complements the existing admin-denied case).
- **Drift test:** every `@Roles(...)` name resolves to the canonical set.
- **Live e2e (post-build):** admin onboards a `cashier`; that cashier logs in and
  **completes a sale**; the superadmin bootstrap admin **creates a company**.

## 8. Out of scope

Coolify staging execution (`SPEC-CUT-002`); fine-grained per-permission authz
(the deferred `permissions`/`role_permissions` tables, `SPEC-CUT-001` B-06);
frontend role UX (B-09, done). No change to `Role` schema — the existing
`is_system_role`/`company_id` columns suffice.
