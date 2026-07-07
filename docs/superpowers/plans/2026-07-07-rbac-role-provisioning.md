# RBAC Role Provisioning & Ghost-Role Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the role model operable on a fresh deploy — seed all system roles idempotently on boot, define+seed `superadmin` (bootstrap admin becomes the platform operator), remove `staff`/`viewer` ghost roles, and enforce a single source of truth for role names.

**Architecture:** A canonical `SYSTEM_ROLES` catalog in the auth constants drives a new idempotent `SystemRolesService.ensureSystemRoles()` (upsert-if-missing) called at the top of `BootstrapService` on every boot. The bootstrap admin is granted `[admin, superadmin]`. Controller `@Roles(...)` decorators are cleaned of undefined names, and a filesystem-scanning jest test guards against future drift.

**Tech Stack:** NestJS 10, TypeORM (MySQL), Jest. Roles are system-wide rows (`Role.name` is globally unique → `company_id: null`, `is_system_role: true`).

## Global Constraints

- Backend runs `NODE_ENV=production` under compose; no `synchronize`. No schema/entity changes in this plan — `Role` already has `name`, `description`, `company_id`, `is_system_role`.
- Roles are matched by `role.name` (see `RolesGuard` + `User.hasAnyRole`). The canonical names live ONLY in `AUTH_CONSTANTS.ROLES` / `SYSTEM_ROLES`.
- `RolesGuard.ELEVATED_ROLES = ['superadmin']` must stay consistent — admin's superuser bypass must never cover superadmin routes.
- Node is not on the host PATH. Run backend commands via the `node:22` container:
  `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest <path>` from `new-implementation/backend`.
- All work on branch `feat/back001-rbac-role-provisioning` (already created off `main`).

---

### Task 1: Canonical role catalog (single source of truth)

**Files:**
- Modify: `new-implementation/backend/src/modules/auth/constants/auth.constants.ts` (add `SUPERADMIN`)
- Create: `new-implementation/backend/src/modules/auth/constants/system-roles.ts`
- Test: `new-implementation/backend/src/modules/auth/constants/system-roles.spec.ts`

**Interfaces:**
- Produces: `AUTH_CONSTANTS.ROLES.SUPERADMIN === 'superadmin'`; `SYSTEM_ROLES: readonly { name: string; description: string }[]` (6 entries: superadmin, admin, manager, cashier, inventory_manager, accountant).

- [ ] **Step 1: Write the failing test**

```typescript
// system-roles.spec.ts
import { AUTH_CONSTANTS } from './auth.constants';
import { SYSTEM_ROLES } from './system-roles';

describe('SYSTEM_ROLES catalog', () => {
  it('exposes superadmin in the role constants', () => {
    expect(AUTH_CONSTANTS.ROLES.SUPERADMIN).toBe('superadmin');
  });

  it('defines the six system roles with a name and description', () => {
    const names = SYSTEM_ROLES.map((r) => r.name);
    expect(names).toEqual([
      'superadmin', 'admin', 'manager', 'cashier', 'inventory_manager', 'accountant',
    ]);
    for (const r of SYSTEM_ROLES) {
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest src/modules/auth/constants/system-roles.spec.ts`
Expected: FAIL — `Cannot find module './system-roles'` and `SUPERADMIN` undefined.

- [ ] **Step 3: Add SUPERADMIN to auth.constants.ts**

In `auth.constants.ts`, in the `ROLES` object, add `SUPERADMIN` as the first entry:

```typescript
  ROLES: {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    MANAGER: 'manager',
    CASHIER: 'cashier',
    INVENTORY_MANAGER: 'inventory_manager',
    ACCOUNTANT: 'accountant',
  },
```

- [ ] **Step 4: Create system-roles.ts**

```typescript
// system-roles.ts
import { AUTH_CONSTANTS } from './auth.constants';

export interface SystemRoleDef {
  name: string;
  description: string;
}

/** Canonical system-wide roles. Ordered superadmin → accountant. */
export const SYSTEM_ROLES: readonly SystemRoleDef[] = [
  { name: AUTH_CONSTANTS.ROLES.SUPERADMIN, description: 'Platform operator (cross-tenant provisioning)' },
  { name: AUTH_CONSTANTS.ROLES.ADMIN, description: 'Tenant administrator' },
  { name: AUTH_CONSTANTS.ROLES.MANAGER, description: 'Store manager' },
  { name: AUTH_CONSTANTS.ROLES.CASHIER, description: 'Cashier / POS operator' },
  { name: AUTH_CONSTANTS.ROLES.INVENTORY_MANAGER, description: 'Inventory manager' },
  { name: AUTH_CONSTANTS.ROLES.ACCOUNTANT, description: 'Accountant' },
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest src/modules/auth/constants/system-roles.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add new-implementation/backend/src/modules/auth/constants/
git commit -m "feat(auth): canonical SYSTEM_ROLES catalog + superadmin constant"
```

---

### Task 2: SystemRolesService (idempotent boot sync)

**Files:**
- Create: `new-implementation/backend/src/modules/bootstrap/system-roles.service.ts`
- Modify: `new-implementation/backend/src/modules/bootstrap/bootstrap.module.ts` (register provider)
- Test: `new-implementation/backend/src/modules/bootstrap/tests/system-roles.service.spec.ts`

**Interfaces:**
- Consumes: `SYSTEM_ROLES` (Task 1), `Role` entity, TypeORM `Repository<Role>`.
- Produces: `SystemRolesService.ensureSystemRoles(): Promise<Map<string, Role>>` — creates only missing roles (`is_system_role: true`, `company_id: null`), returns all system roles keyed by name.

- [ ] **Step 1: Write the failing test**

```typescript
// system-roles.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemRolesService } from '../system-roles.service';
import { Role } from '../../auth/entities/role.entity';
import { SYSTEM_ROLES } from '../../auth/constants/system-roles';

describe('SystemRolesService.ensureSystemRoles', () => {
  function build(existing: Partial<Role>[]) {
    const store = [...existing];
    const repo = {
      findOne: jest.fn(({ where: { name } }) =>
        Promise.resolve(store.find((r) => r.name === name) ?? null),
      ),
      create: jest.fn((r) => r),
      save: jest.fn((r) => {
        const saved = { ...r, id: `id-${r.name}` };
        store.push(saved);
        return Promise.resolve(saved);
      }),
    };
    return { repo, store };
  }

  async function svc(repo: any): Promise<SystemRolesService> {
    const mod = await Test.createTestingModule({
      providers: [
        SystemRolesService,
        { provide: getRepositoryToken(Role), useValue: repo },
      ],
    }).compile();
    return mod.get(SystemRolesService);
  }

  it('creates every missing system role as a system-wide role', async () => {
    const { repo } = build([]);
    const result = await (await svc(repo)).ensureSystemRoles();

    expect(repo.save).toHaveBeenCalledTimes(SYSTEM_ROLES.length);
    expect(result.size).toBe(SYSTEM_ROLES.length);
    const saved = repo.save.mock.calls.map((c: any[]) => c[0]);
    for (const s of saved) {
      expect(s.is_system_role).toBe(true);
      expect(s.company_id).toBeNull();
    }
    expect(result.get('superadmin')).toBeDefined();
  });

  it('is idempotent — does not recreate existing roles', async () => {
    const existing = SYSTEM_ROLES.map((r) => ({ ...r, id: `id-${r.name}`, is_system_role: true, company_id: null }));
    const { repo } = build(existing);
    const result = await (await svc(repo)).ensureSystemRoles();

    expect(repo.save).not.toHaveBeenCalled();
    expect(result.size).toBe(SYSTEM_ROLES.length);
  });

  it('creates only the missing roles when some already exist', async () => {
    const { repo } = build([{ name: 'admin', id: 'id-admin', is_system_role: true, company_id: null }]);
    await (await svc(repo)).ensureSystemRoles();
    expect(repo.save).toHaveBeenCalledTimes(SYSTEM_ROLES.length - 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest src/modules/bootstrap/tests/system-roles.service.spec.ts`
Expected: FAIL — `Cannot find module '../system-roles.service'`.

- [ ] **Step 3: Implement the service**

```typescript
// system-roles.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../auth/entities/role.entity';
import { SYSTEM_ROLES } from '../auth/constants/system-roles';

/**
 * Idempotent system-role reconciliation. Runs on every boot (via
 * BootstrapService) so both fresh and already-bootstrapped databases end up
 * with the full canonical role set. Creates only missing roles; never mutates
 * or duplicates an existing one.
 */
@Injectable()
export class SystemRolesService {
  private readonly logger = new Logger(SystemRolesService.name);

  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  async ensureSystemRoles(): Promise<Map<string, Role>> {
    const byName = new Map<string, Role>();
    for (const def of SYSTEM_ROLES) {
      let role = await this.roleRepo.findOne({ where: { name: def.name } });
      if (!role) {
        role = await this.roleRepo.save(
          this.roleRepo.create({
            name: def.name,
            description: def.description,
            is_system_role: true,
            company_id: null,
          }),
        );
        this.logger.log(`Created system role "${def.name}".`);
      }
      byName.set(def.name, role);
    }
    return byName;
  }
}
```

- [ ] **Step 4: Register the provider**

In `bootstrap.module.ts`, import and add `SystemRolesService` to `providers` (keep `TypeOrmModule.forFeature([User, Role, Company])`):

```typescript
import { SystemRolesService } from './system-roles.service';
// ...
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Company])],
  providers: [BootstrapService, SystemRolesService],
})
export class BootstrapModule {}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest src/modules/bootstrap/tests/system-roles.service.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add new-implementation/backend/src/modules/bootstrap/
git commit -m "feat(bootstrap): idempotent SystemRolesService.ensureSystemRoles"
```

---

### Task 3: BootstrapService — sync roles first, grant admin superadmin

**Files:**
- Modify: `new-implementation/backend/src/modules/bootstrap/bootstrap.service.ts`
- Test: `new-implementation/backend/src/modules/bootstrap/tests/bootstrap.service.spec.ts` (update)

**Interfaces:**
- Consumes: `SystemRolesService.ensureSystemRoles()` (Task 2).
- Produces: on empty DB, the bootstrap admin user is saved with `roles: [adminRole, superadminRole]`; `ensureSystemRoles()` runs on every boot regardless of user count.

- [ ] **Step 1: Update the spec (failing test)**

In `bootstrap.service.spec.ts`, provide a mocked `SystemRolesService` and assert both behaviors. Key additions (adapt to the file's existing harness — it builds the module with `getRepositoryToken` mocks):

```typescript
// Provide alongside the existing repo mocks:
const ensureSystemRoles = jest.fn().mockResolvedValue(
  new Map([
    ['admin', { id: 'role-admin', name: 'admin' }],
    ['superadmin', { id: 'role-superadmin', name: 'superadmin' }],
  ]),
);
// { provide: SystemRolesService, useValue: { ensureSystemRoles } }

it('reconciles system roles on every boot, even when users already exist', async () => {
  userRepo.count.mockResolvedValue(5); // already bootstrapped
  await service.onApplicationBootstrap();
  expect(ensureSystemRoles).toHaveBeenCalledTimes(1);
  expect(userRepo.save).not.toHaveBeenCalled();
});

it('grants the bootstrap admin both admin and superadmin on an empty DB', async () => {
  userRepo.count.mockResolvedValue(0);
  process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@x.io';
  process.env.BOOTSTRAP_ADMIN_PASSWORD = 'ExactlyTwelve1!';
  await service.onApplicationBootstrap();
  const savedUser = userRepo.save.mock.calls.at(-1)[0];
  const roleNames = savedUser.roles.map((r: any) => r.name).sort();
  expect(roleNames).toEqual(['admin', 'superadmin']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest src/modules/bootstrap/tests/bootstrap.service.spec.ts`
Expected: FAIL — `ensureSystemRoles` not called; saved user has only `[admin]`.

- [ ] **Step 3: Refactor BootstrapService**

Replace the `@InjectRepository(Role) roleRepo` dependency with `SystemRolesService`, run it first, and assign both roles. The `onApplicationBootstrap` body becomes:

```typescript
async onApplicationBootstrap(): Promise<void> {
  try {
    const systemRoles = await this.systemRoles.ensureSystemRoles();

    const userCount = await this.userRepo.count();
    if (userCount > 0) return; // already initialized — never re-seed users

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!email || !password) {
      this.logger.warn(
        'No users in the database and BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD ' +
          'are not set — no admin will be created. Set them and restart to bootstrap ' +
          'the first admin.',
      );
      return;
    }

    if (password.length < BootstrapService.MIN_PASSWORD_LENGTH) {
      this.logger.error(
        `BOOTSTRAP_ADMIN_PASSWORD must be at least ${BootstrapService.MIN_PASSWORD_LENGTH} ` +
          'characters — skipping admin bootstrap.',
      );
      return;
    }

    const company = await this.companyRepo.save(
      this.companyRepo.create({
        name: process.env.BOOTSTRAP_COMPANY_NAME?.trim() || 'Default Company',
      }),
    );

    const passwordHash = await bcrypt.hash(
      password,
      AUTH_CONSTANTS.PASSWORD.BCRYPT_ROUNDS,
    );

    const adminRole = systemRoles.get(AUTH_CONSTANTS.ROLES.ADMIN);
    const superadminRole = systemRoles.get(AUTH_CONSTANTS.ROLES.SUPERADMIN);

    await this.userRepo.save(
      this.userRepo.create({
        email,
        password_hash: passwordHash,
        name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administrator',
        company_id: company.id,
        is_active: true,
        roles: [adminRole, superadminRole], // platform operator on first deploy
      }),
    );

    this.logger.log(
      `Bootstrapped admin user "${email}" (company "${company.name}") with roles admin, superadmin.`,
    );
  } catch (error) {
    this.logger.error(`Admin bootstrap failed: ${error?.message ?? error}`);
  }
}
```

Update the constructor: remove the `Role` repo injection, add `SystemRolesService`:

```typescript
constructor(
  @InjectRepository(User) private readonly userRepo: Repository<User>,
  @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
  private readonly systemRoles: SystemRolesService,
) {}
```

Add the import: `import { SystemRolesService } from './system-roles.service';` and drop the now-unused `Role` import if nothing else uses it.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest src/modules/bootstrap/tests/bootstrap.service.spec.ts`
Expected: PASS (existing cases + 2 new).

- [ ] **Step 5: Commit**

```bash
git add new-implementation/backend/src/modules/bootstrap/
git commit -m "feat(bootstrap): sync system roles on boot + grant admin superadmin"
```

---

### Task 4: Ghost-role drift guard + decorator cleanup

**Files:**
- Create: `new-implementation/backend/src/modules/auth/tests/roles-decorator-drift.spec.ts`
- Modify: `new-implementation/backend/src/modules/reports/reports.controller.ts:83,97`
- Modify: `new-implementation/backend/src/modules/notifications/notifications.controller.ts:42,53,61,72,88`
- Modify: `new-implementation/backend/src/modules/customers/customers.controller.ts:48,96`

**Interfaces:**
- Consumes: `SYSTEM_ROLES` (Task 1).
- Produces: a test asserting every `@Roles(...)` name across `src/modules/**/*.controller.ts` is in the canonical set.

- [ ] **Step 1: Write the failing test**

```typescript
// roles-decorator-drift.spec.ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { SYSTEM_ROLES } from '../constants/system-roles';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

describe('@Roles decorator role names', () => {
  const canonical = new Set(SYSTEM_ROLES.map((r) => r.name));
  const modulesDir = join(__dirname, '..', '..'); // src/modules
  const files = walk(modulesDir);

  it('references only defined system roles', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/@Roles\(([^)]*)\)/g)) {
        for (const nameMatch of m[1].matchAll(/'([^']+)'/g)) {
          if (!canonical.has(nameMatch[1])) {
            offenders.push(`${file.replace(modulesDir, 'modules')}: '${nameMatch[1]}'`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest src/modules/auth/tests/roles-decorator-drift.spec.ts`
Expected: FAIL — offenders list contains `'staff'` (reports, notifications) and `'viewer'` (customers).

- [ ] **Step 3: Remove `staff` from reports + notifications**

In `reports.controller.ts` (lines 83, 97) and `notifications.controller.ts` (lines 42, 53, 61, 72, 88), replace each:

```typescript
  @Roles('admin', 'manager', 'staff')
```
with
```typescript
  @Roles('admin', 'manager')
```

- [ ] **Step 4: Remove `viewer` from customers**

In `customers.controller.ts` (lines 48, 96), replace each:

```typescript
  @Roles('admin', 'manager', 'cashier', 'viewer')
```
with
```typescript
  @Roles('admin', 'manager', 'cashier')
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest src/modules/auth/tests/roles-decorator-drift.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add new-implementation/backend/src/modules/
git commit -m "fix(auth): drop undefined staff/viewer roles from @Roles + drift guard"
```

---

### Task 5: RolesGuard — superadmin regression coverage

**Files:**
- Modify: `new-implementation/backend/src/modules/auth/guards/roles.guard.spec.ts` (add case)
- Modify: `new-implementation/backend/src/modules/auth/guards/roles.guard.ts` (comment only)

**Interfaces:**
- Consumes: existing `RolesGuard` + `userWithRoles` helper in the spec.
- Produces: no behavior change — a regression test documenting that a real superadmin user passes a `@Roles('superadmin')` route (complements the existing "admin denied on superadmin route" case).

- [ ] **Step 1: Add the regression test**

Append to `roles.guard.spec.ts` (uses the file's existing `userWithRoles` / `contextFor` helpers):

```typescript
it('lets a superadmin pass a superadmin-only route', () => {
  reflector.get.mockReturnValue(['superadmin']);
  expect(guard.canActivate(contextFor(['superadmin'], userWithRoles('superadmin')))).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it passes (characterization — no code change)**

Run: `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest src/modules/auth/guards/roles.guard.spec.ts`
Expected: PASS (9 cases). This behavior already works via literal membership; the test locks it in now that `superadmin` is a real seeded role.

- [ ] **Step 3: Refresh the ELEVATED_ROLES comment**

In `roles.guard.ts`, update the `ELEVATED_ROLES` doc comment to note superadmin is now a seeded platform role (not a ghost):

```typescript
/**
 * Roles that sit ABOVE the tenant admin (platform-level, cross-tenant). Seeded
 * as a real system role (SYSTEM_ROLES) and held by the first bootstrap admin.
 * The admin superuser bypass below does NOT apply to routes guarded by these —
 * an admin must hold the role literally.
 */
const ELEVATED_ROLES: string[] = ['superadmin'];
```

- [ ] **Step 4: Commit**

```bash
git add new-implementation/backend/src/modules/auth/guards/
git commit -m "test(auth): superadmin passes superadmin route + refresh guard comment"
```

---

### Task 6: Full-suite regression + live end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full backend unit suite**

Run: `docker run --rm -v "$PWD":/app -w /app node:22 node_modules/.bin/jest`
Expected: PASS, all suites green (prior 190 + new: system-roles catalog 2, service 3, bootstrap +2, drift 1, guard +1).

- [ ] **Step 2: Build & boot the stack** (reuse the dry-run compose or `docker compose`)

From `new-implementation/`, bring up mysql + backend with a fresh volume so bootstrap runs:
```bash
docker compose -f <compose> up -d --build mysql backend
```
Confirm logs: `Created system role "..."` lines (6), then `Bootstrapped admin user "..." with roles admin, superadmin`.

- [ ] **Step 3: Verify roles seeded + admin has superadmin**

```bash
# 6 system roles present
mysql ... -e "SELECT name, is_system_role, company_id FROM roles ORDER BY name;"
# admin user carries admin + superadmin
mysql ... -e "SELECT u.email, GROUP_CONCAT(r.name) FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id GROUP BY u.email;"
```
Expected: rows for superadmin/admin/manager/cashier/inventory_manager/accountant; admin user → `admin,superadmin`.

- [ ] **Step 4: Onboard a cashier and complete a sale as that cashier**

- Login as admin → `GET /users/roles/list` now returns 6 roles.
- `POST /users` with the `cashier` role id → 201.
- Login as the cashier → create/complete a sale (`POST /sales/orders`) → **201** (cashier can sell without admin).

- [ ] **Step 5: Provision a tenant as the superadmin bootstrap admin**

- As the bootstrap admin, `POST /companies {"name":"Empresa Dos"}` → **201** (was 403 pre-fix; superadmin now seeded and held).

- [ ] **Step 6: Tear down + final commit if any verification fixes were needed**

```bash
docker compose -f <compose> down -v
# only if Step 1–5 forced a code change:
git commit -am "fix(auth): address role-provisioning e2e findings"
```

---

## Self-Review

**Spec coverage:** §3 catalog → Task 1; §4.1 SystemRolesService → Task 2; §4.2 BootstrapService (sync-first + admin gets both) → Task 3; §4.3 RolesGuard → Task 5; §4.4 decorator cleanup → Task 4; §4.5 drift test → Task 4; §7 testing (unit specs + live e2e) → Tasks 2/3/4/5 + Task 6. All covered.

**Placeholder scan:** none — every code step shows full code; commands include the container invocation and expected output.

**Type consistency:** `ensureSystemRoles(): Promise<Map<string, Role>>` produced in Task 2 and consumed in Task 3; `SYSTEM_ROLES` shape (`{name, description}`) defined in Task 1 and consumed in Tasks 2 & 4; `AUTH_CONSTANTS.ROLES.SUPERADMIN` defined in Task 1 and used in Tasks 3 & 5. Consistent.

**Note on Task 6 live steps:** exact DB creds/compose path are environment-specific — reuse the session's dry-run compose file and MySQL credentials.
