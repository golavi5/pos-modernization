# RBAC Follow-ups + Staging Dry-Run Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the RBAC follow-ups deferred from PR #24 (POS-BACK-001) and the non-infra prep items from SPEC-CUT-002, leaving the backend unit suite green and a mergeable PR against main.

**Architecture:** Seven independent tasks. Tasks 1, 2, 4, 5 are code and follow strict red→green TDD. Tasks 3, 6, 7 are documentation/ops changes (a code comment, a local rehearsal record, a checklist edit) — they are committed per-item but do not force an artificial red-green cycle on markdown. One commit per task.

**Tech Stack:** NestJS 10 + TypeScript + Jest (backend unit tests via `node:20-alpine` container), MySQL 8.0 (via docker-compose for the backup/restore rehearsal), bash scripts.

## Global Constraints

- Baseline before any change: **204 tests, 20 suites, 0 failures**. Track the final count against this.
- Run all `npm` commands inside the `node:20-alpine` container (no node on host):
  `docker run --rm -v "$PWD/new-implementation/backend:/app" -w /app node:20-alpine sh -c '<cmd>'`
  (run from worktree root `/home/gor/devs/pos-modernization/.claude/worktrees/backend-rbac-followups`).
- Do NOT touch `SPEC-FISC-001` (blocked on human review gate).
- Do NOT create a new `SPEC-<MOD>-NNN` file (Kairos synthesizes one Plane issue per file; duplicate numbers abort sync). Durable notes for the `accountant` decision live in a code comment + PR description.
- Do NOT merge to main or `push --force`. End state: commits on the worktree branch + an open PR.
- One commit per task. Final gate: `npm run build` green + full unit suite green.
- GitNexus MCP tools are not available in this session and the index is stale in a fresh worktree — changes here are additive/low-blast-radius; note the deviation in the PR.

---

### Task 1: system-roles seeder — map-value-identity + description assertions

**Files:**
- Modify (test only): `new-implementation/backend/src/modules/bootstrap/tests/system-roles.service.spec.ts`

**Interfaces:**
- Consumes: `SystemRolesService.ensureSystemRoles(): Promise<Map<string, Role>>` (existing), `SYSTEM_ROLES` (existing, each `{name, description}`).
- Produces: nothing consumed downstream (test-only).

**Context:** `ensureSystemRoles` returns a `Map<name, Role>`. The current spec asserts count/idempotency/is_system_role/company_id but never that (a) the map value for an **already-existing** role is the *exact same object* the repo returned (reference identity, `toBe` not `toEqual`), nor (b) that created roles carry the `description` from `SYSTEM_ROLES`.

- [ ] **Step 1: Write the failing tests**

Add these two `it` blocks inside the existing `describe` in `system-roles.service.spec.ts`:

```typescript
  it('returns the exact existing Role object as the map value (no re-creation)', async () => {
    const adminRole = { name: 'admin', id: 'id-admin', is_system_role: true, company_id: null };
    const { repo } = build([adminRole]);
    const result = await (await svc(repo)).ensureSystemRoles();

    // Reference identity: the map must hold the very object findOne returned,
    // not a copy — proves existing roles are passed through untouched.
    expect(result.get('admin')).toBe(adminRole);
  });

  it('creates each missing role with its canonical description', async () => {
    const { repo } = build([]);
    await (await svc(repo)).ensureSystemRoles();

    const saved = repo.save.mock.calls.map((c: any[]) => c[0]);
    for (const def of SYSTEM_ROLES) {
      const match = saved.find((s: any) => s.name === def.name);
      expect(match).toBeDefined();
      expect(match.description).toBe(def.description);
    }
  });
```

- [ ] **Step 2: Run tests to verify they PASS (guard test — behavior already correct)**

Run: `docker run --rm -v "$PWD/new-implementation/backend:/app" -w /app node:20-alpine sh -c 'npx jest system-roles.service.spec --silent 2>&1 | tail -15'`
Expected: PASS. (This task is a coverage/guard extension — `ensureSystemRoles` already returns the found object and sets `description`. The value is locking that contract against regression. If either assertion FAILS, that is a real bug in `system-roles.service.ts` — stop and fix the service, not the test.)

- [ ] **Step 3: Commit**

```bash
git add new-implementation/backend/src/modules/bootstrap/tests/system-roles.service.spec.ts
git commit -m "test(bootstrap): assert seeder map-value identity + descriptions"
```

---

### Task 2: roles-decorator-drift guard — catch double-quoted + constant-ref @Roles args

**Files:**
- Modify: `new-implementation/backend/src/modules/auth/tests/roles-decorator-drift.spec.ts`

**Interfaces:**
- Consumes: `SYSTEM_ROLES` (existing), `AUTH_CONSTANTS` from `../constants/auth.constants` (existing — `AUTH_CONSTANTS.ROLES.<KEY>` maps to a role-name string).
- Produces: a test-only pure function `extractRoleNames(src, resolveConst)` — not exported to app code.

**Context:** The current regex only matches single-quoted literals inside `@Roles(...)`: `/'([^']+)'/g`. It silently ignores `@Roles("manager")` (double quotes) and `@Roles(AUTH_CONSTANTS.ROLES.CASHIER)` (constant reference). All real controllers today use single-quoted literals (verified), so extending coverage stays green against the codebase — the red is produced by feeding synthetic samples to an extracted pure function.

Decision (state in code comment): an **unresolvable** constant identifier (e.g. `SOME.UNKNOWN.PATH`) is **flagged as an offender**, because an unresolved reference is exactly the drift the guard exists to catch.

- [ ] **Step 1: Rewrite the spec with an extracted pure extractor + unit tests for it, then re-run the filesystem guard through it**

Replace the entire contents of `roles-decorator-drift.spec.ts` with:

```typescript
// roles-decorator-drift.spec.ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { SYSTEM_ROLES } from '../constants/system-roles';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

/**
 * Resolve a dotted constant reference (e.g. "AUTH_CONSTANTS.ROLES.CASHIER")
 * to its string value. Returns undefined if the path doesn't resolve — the
 * caller treats an unresolvable reference as an offender (that's the drift
 * the guard exists to catch).
 */
function resolveConst(path: string): string | undefined {
  const parts = path.split('.');
  if (parts[0] !== 'AUTH_CONSTANTS') return undefined;
  let cur: any = AUTH_CONSTANTS;
  for (const key of parts.slice(1)) {
    if (cur == null || typeof cur !== 'object' || !(key in cur)) return undefined;
    cur = cur[key];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/**
 * Extract every role name referenced by @Roles(...) in a source string.
 * Handles single-quoted, double-quoted, and AUTH_CONSTANTS.* referenced args.
 * An unresolvable constant reference yields the literal token so it surfaces
 * as an offender against the canonical set.
 */
export function extractRoleNames(src: string): string[] {
  const names: string[] = [];
  for (const m of src.matchAll(/@Roles\(([^)]*)\)/g)) {
    const args = m[1];
    // Split on commas so each argument is inspected independently.
    for (const rawArg of args.split(',')) {
      const arg = rawArg.trim();
      if (!arg) continue;
      const quoted = arg.match(/^['"]([^'"]+)['"]$/);
      if (quoted) {
        names.push(quoted[1]);
        continue;
      }
      if (/^[A-Za-z_$][\w.$]*$/.test(arg)) {
        // Bare identifier / dotted constant reference.
        names.push(resolveConst(arg) ?? arg);
      }
    }
  }
  return names;
}

describe('extractRoleNames (drift-guard extractor)', () => {
  it('extracts single-quoted role names', () => {
    expect(extractRoleNames(`@Roles('admin', 'manager')`)).toEqual(['admin', 'manager']);
  });

  it('extracts double-quoted role names', () => {
    expect(extractRoleNames(`@Roles("manager")`)).toEqual(['manager']);
  });

  it('resolves AUTH_CONSTANTS.ROLES.* constant references', () => {
    expect(extractRoleNames(`@Roles(AUTH_CONSTANTS.ROLES.CASHIER)`)).toEqual([
      AUTH_CONSTANTS.ROLES.CASHIER,
    ]);
  });

  it('handles mixed quoting + constant refs in one decorator', () => {
    expect(
      extractRoleNames(`@Roles('admin', "manager", AUTH_CONSTANTS.ROLES.CASHIER)`),
    ).toEqual(['admin', 'manager', AUTH_CONSTANTS.ROLES.CASHIER]);
  });

  it('surfaces an unresolvable constant reference as its literal token', () => {
    expect(extractRoleNames(`@Roles(AUTH_CONSTANTS.ROLES.BOGUS)`)).toEqual([
      'AUTH_CONSTANTS.ROLES.BOGUS',
    ]);
  });

  it('surfaces an unknown quoted role', () => {
    expect(extractRoleNames(`@Roles('wizard')`)).toEqual(['wizard']);
  });
});

describe('@Roles decorator role names', () => {
  const canonical = new Set(SYSTEM_ROLES.map((r) => r.name));
  const modulesDir = join(__dirname, '..', '..'); // src/modules
  const files = walk(modulesDir);

  it('references only defined system roles', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const name of extractRoleNames(src)) {
        if (!canonical.has(name)) {
          offenders.push(`${file.replace(modulesDir, 'modules')}: '${name}'`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Prove red — the OLD single-quote-only logic fails the new samples**

Sanity check the extractor logic is genuinely exercised: temporarily confirm the double-quote / constant-ref / unknown cases are non-trivial by running just the extractor block.

Run: `docker run --rm -v "$PWD/new-implementation/backend:/app" -w /app node:20-alpine sh -c 'npx jest roles-decorator-drift --silent 2>&1 | tail -20'`
Expected: PASS (the new extractor handles all cases; the filesystem guard stays green because all real controllers use single-quoted literals). The red→green evidence is that the *old* regex (`/'([^']+)'/g`) would have returned `[]` for `@Roles("manager")` and `@Roles(AUTH_CONSTANTS.ROLES.CASHIER)` — the new extractor tests assert the correct non-empty result, which the old code could not produce.

- [ ] **Step 3: Commit**

```bash
git add new-implementation/backend/src/modules/auth/tests/roles-decorator-drift.spec.ts
git commit -m "test(auth): drift guard catches double-quoted + constant-ref @Roles args"
```

---

### Task 3: accountant role — mark explicitly reserved for M5 fiscal work

**Files:**
- Modify: `new-implementation/backend/src/modules/auth/constants/system-roles.ts`

**Interfaces:** none (comment-only).

**Context:** `accountant` is seeded in `SYSTEM_ROLES` but no `@Roles()` references it. Smallest reasonable call (per constraints): mark it explicitly reserved via a code comment rather than wiring an unspecced authz change into a reports route. Record the rationale in the PR description. Do NOT create a SPEC file (Kairos landmine) and do NOT touch SPEC-FISC-001.

- [ ] **Step 1: Add the reserved-role comment**

In `system-roles.ts`, change the `accountant` line to carry an inline reservation note:

```typescript
  { name: AUTH_CONSTANTS.ROLES.INVENTORY_MANAGER, description: 'Inventory manager' },
  // RESERVED: `accountant` is seeded so it exists as an assignable role, but no
  // route gates on it yet. It is intentionally reserved for M5 fiscal work
  // (SPEC-FISC-001) — do NOT wire it into a @Roles() check until that spec is
  // approved and defines the endpoints it should protect.
  { name: AUTH_CONSTANTS.ROLES.ACCOUNTANT, description: 'Accountant' },
```

- [ ] **Step 2: Verify the drift guard + seeder tests still pass (nothing behavioral changed)**

Run: `docker run --rm -v "$PWD/new-implementation/backend:/app" -w /app node:20-alpine sh -c 'npx jest roles-decorator-drift system-roles.service --silent 2>&1 | tail -10'`
Expected: PASS (comment-only change).

- [ ] **Step 3: Commit**

```bash
git add new-implementation/backend/src/modules/auth/constants/system-roles.ts
git commit -m "docs(auth): mark accountant role reserved for M5 fiscal work"
```

---

### Task 4: service-layer tenant-scoping tests (reports + notifications)

**Files:**
- Create: `new-implementation/backend/src/modules/reports/tests/sales-report.service.spec.ts`
- Create: `new-implementation/backend/src/modules/notifications/tests/notification-scheduler.service.spec.ts`

**Interfaces:**
- Consumes: `SalesReportService.getSalesSummary(companyId, query)` → calls `orderRepository.find({ where: { company_id, created_at } })`. `NotificationSchedulerService.checkLowStock(companyId)` → calls `productRepo.find({ where: { company_id, is_active } })` and `notificationRepo.find({ where: { companyId, isRead, type } })`.
- Produces: nothing downstream (test-only).

**Context:** Existing tenant-scoping tests are controller-layer (`reports.controller.spec.ts` asserts the controller forwards `user.company_id`). This adds the missing service-layer proof that the query itself filters by `company_id`. Chosen representatives: `SalesReportService.getSalesSummary` (plain `.find` with `where.company_id`) and `NotificationSchedulerService.checkLowStock` (plain `.find` with `where.company_id` / `where.companyId`) — both avoid a chainable QueryBuilder mock.

- [ ] **Step 1: Write the failing reports service test**

Create `new-implementation/backend/src/modules/reports/tests/sales-report.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SalesReportService } from '../services/sales-report.service';
import { Order } from '../../sales/entities/order.entity';
import { OrderItem } from '../../sales/entities/order-item.entity';
import { ReportQueryDto, PeriodType } from '../dto/report-query.dto';

/**
 * Service-layer tenant-scoping guard (complements the controller-layer
 * reports.controller.spec). Proves the query itself filters by company_id —
 * a controller that forwards the right company_id is worthless if the service
 * ignores it. See SPEC-CUT-001 S-07.
 */
describe('SalesReportService (tenant scoping)', () => {
  let service: SalesReportService;
  let orderRepo: { find: jest.Mock };

  const query: ReportQueryDto = {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    period: PeriodType.MONTHLY,
  } as ReportQueryDto;

  beforeEach(async () => {
    orderRepo = { find: jest.fn().mockResolvedValue([]) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesReportService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: { find: jest.fn() } },
      ],
    }).compile();
    service = module.get(SalesReportService);
  });

  it('scopes every order query to the caller company_id', async () => {
    await service.getSalesSummary('company-A', query);

    expect(orderRepo.find).toHaveBeenCalled();
    for (const call of orderRepo.find.mock.calls) {
      expect(call[0].where).toEqual(
        expect.objectContaining({ company_id: 'company-A' }),
      );
    }
  });

  it('never leaks another tenant company_id into the query', async () => {
    await service.getSalesSummary('company-B', query);

    for (const call of orderRepo.find.mock.calls) {
      expect(call[0].where.company_id).toBe('company-B');
      expect(call[0].where.company_id).not.toBe('company-A');
    }
  });
});
```

- [ ] **Step 2: Run to verify it PASSES (guard test — filtering already implemented)**

Run: `docker run --rm -v "$PWD/new-implementation/backend:/app" -w /app node:20-alpine sh -c 'npx jest sales-report.service --silent 2>&1 | tail -15'`
Expected: PASS. (`getSalesSummary` calls `calculatePeriodMetrics` twice — current + previous period — so `orderRepo.find` is called ≥2×, each with `company_id`. If a call is missing `company_id`, that is a real tenant-leak bug — stop and fix the service.)

- [ ] **Step 3: Write the notifications scheduler service test**

Create `new-implementation/backend/src/modules/notifications/tests/notification-scheduler.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationSchedulerService } from '../services/notification-scheduler.service';
import { NotificationsService } from '../services/notifications.service';
import { Notification } from '../entities/notification.entity';
import { Product } from '../../products/entities/product.entity';

/**
 * Service-layer tenant-scoping guard for the low-stock scheduler. Proves both
 * the product scan and the open-alert dedupe query filter by the caller's
 * company. See SPEC-CUT-001 S-07.
 */
describe('NotificationSchedulerService (tenant scoping)', () => {
  let service: NotificationSchedulerService;
  let productRepo: { find: jest.Mock };
  let notificationRepo: { find: jest.Mock };
  let notificationsService: { create: jest.Mock };

  beforeEach(async () => {
    productRepo = { find: jest.fn().mockResolvedValue([]) };
    notificationRepo = { find: jest.fn().mockResolvedValue([]) };
    notificationsService = { create: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSchedulerService,
        { provide: NotificationsService, useValue: notificationsService },
        { provide: getRepositoryToken(Notification), useValue: notificationRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();
    service = module.get(NotificationSchedulerService);
  });

  it('scopes the product scan to the caller company_id', async () => {
    await service.checkLowStock('company-A');

    expect(productRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ company_id: 'company-A' }),
      }),
    );
  });

  it('scopes the open-alert dedupe query to the caller company', async () => {
    await service.checkLowStock('company-A');

    expect(notificationRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'company-A' }),
      }),
    );
  });

  it('never queries products for a different tenant', async () => {
    await service.checkLowStock('company-B');

    expect(productRepo.find).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ company_id: 'company-A' }),
      }),
    );
  });
});
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `docker run --rm -v "$PWD/new-implementation/backend:/app" -w /app node:20-alpine sh -c 'npx jest notification-scheduler.service --silent 2>&1 | tail -15'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add new-implementation/backend/src/modules/reports/tests/sales-report.service.spec.ts new-implementation/backend/src/modules/notifications/tests/notification-scheduler.service.spec.ts
git commit -m "test(reports,notifications): service-layer tenant-scoping guards (S-07)"
```

---

### Task 5: AppController health/readiness unit tests

**Files:**
- Create: `new-implementation/backend/src/app.controller.spec.ts`

**Interfaces:**
- Consumes: `AppController.getHealth()` → `{status, timestamp}` (delegates to `AppService.getHealth`, no DB), `AppController.getReadiness()` → `Promise<{status, db, timestamp}>` (calls `dataSource.query('SELECT 1')`, throws `ServiceUnavailableException` on failure).
- Produces: nothing downstream (test-only).

**Context:** `app.controller.ts` has zero coverage. Unit test (not e2e — there is no HTTP layer here): liveness returns OK regardless of DB state; readiness resolves when `dataSource.query` succeeds and throws `ServiceUnavailableException` (HTTP 503) when it rejects.

- [ ] **Step 1: Write the failing tests**

Create `new-implementation/backend/src/app.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let query: jest.Mock;

  async function build(): Promise<void> {
    query = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: getDataSourceToken(), useValue: { query } as Partial<DataSource> },
      ],
    }).compile();
    controller = module.get(AppController);
  }

  beforeEach(build);

  describe('liveness /health', () => {
    it('returns OK and never touches the datasource', () => {
      query.mockRejectedValue(new Error('db down'));
      const res = controller.getHealth();
      expect(res.status).toBe('OK');
      expect(typeof res.timestamp).toBe('string');
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('readiness /health/ready', () => {
    it('returns ready + db up when SELECT 1 succeeds', async () => {
      query.mockResolvedValue([{ '1': 1 }]);
      const res = await controller.getReadiness();
      expect(res.status).toBe('ready');
      expect(res.db).toBe('up');
      expect(query).toHaveBeenCalledWith('SELECT 1');
    });

    it('throws 503 ServiceUnavailable when the db ping fails', async () => {
      query.mockRejectedValue(new Error('connection refused'));
      await expect(controller.getReadiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      try {
        await controller.getReadiness();
      } catch (err: any) {
        expect(err.getStatus()).toBe(503);
        expect(err.getResponse()).toMatchObject({ status: 'unavailable', db: 'down' });
      }
    });
  });
});
```

- [ ] **Step 2: Run to verify it PASSES**

Run: `docker run --rm -v "$PWD/new-implementation/backend:/app" -w /app node:20-alpine sh -c 'npx jest app.controller --silent 2>&1 | tail -15'`
Expected: PASS. (If the DI token for the DataSource is wrong, the module fails to compile — `getDataSourceToken()` from `@nestjs/typeorm` is the correct injector token matching `@InjectDataSource()`.)

- [ ] **Step 3: Commit**

```bash
git add new-implementation/backend/src/app.controller.spec.ts
git commit -m "test(app): cover /health liveness + /health/ready readiness"
```

---

### Task 6: Local backup/restore rehearsal against docker-compose MySQL

**Files:**
- Modify (fix if bugs found): `new-implementation/scripts/db-backup.sh`, `new-implementation/scripts/db-restore.sh`
- Modify (append section): `new-implementation/STAGING-DRY-RUN-RESULTS.md`

**Interfaces:** none (ops rehearsal + doc).

**Context:** Rehearse backup → restore into a scratch DB → row-count parity, against the compose MySQL stack. Gotchas (from advisor): no mysql client on host → run `mysqldump`/`mysql` inside a `mysql:8.0` container on the compose network; an empty DB gives a meaningless 0=0 comparison → seed a few rows first; `db-restore.sh` does not `CREATE DATABASE` (single-DB dump) → the scratch DB must be created before restore. Record commands + result + row-count comparison as a new section following the doc's existing format.

- [ ] **Step 1: Bring up the compose MySQL and seed recognizable rows**

Run (from `new-implementation/`, with a throwaway `.env`/`backend/.env` if needed to satisfy compose): bring up only the `db` service, wait for healthy, apply `database/schema.sql`, and insert a small known set of rows (e.g. 1 company, 1 role, 1 user, 2 products). Capture the exact commands used — they go verbatim into the doc.

The rehearsal must exec the scripts inside a mysql client container joined to the compose network, e.g.:
`docker run --rm --network <compose_net> -e DB_PASSWORD=<pw> -v "$PWD/scripts:/scripts" -v "$PWD/backups:/backups" -w /scripts -e DB_HOST=<db_service> -e DB_PORT=3306 -e DB_USERNAME=<user> -e DB_NAME=<db> mysql:8.0 bash db-backup.sh`

- [ ] **Step 2: Run backup → create scratch DB → restore → compare row counts**

Execute `db-backup.sh`, `CREATE DATABASE <scratch>`, then `DB_NAME=<scratch> CONFIRM=yes db-restore.sh <dump>`. Compare `SELECT COUNT(*)` per seeded table between source and scratch. Fix any script bug encountered (e.g. missing `CREATE DATABASE`, quoting, client flags) and re-run until parity is clean. If a script is edited, keep the change minimal and note it in the doc + PR.

- [ ] **Step 3: Append the rehearsal section to STAGING-DRY-RUN-RESULTS.md**

Add a `## Local backup/restore rehearsal` section (dated 2026-07-09) following the doc's existing format: commands run, result, and a source-vs-scratch row-count table. If no script bug was found, say so explicitly; if a fix was made, describe it.

- [ ] **Step 4: Tear down and commit**

```bash
docker compose down   # (only the db service if brought up alone)
git add new-implementation/scripts/db-backup.sh new-implementation/scripts/db-restore.sh new-implementation/STAGING-DRY-RUN-RESULTS.md
git commit -m "chore(ops): rehearse local backup/restore + record results"
```
(Only `git add` the scripts if they were actually modified.)

---

### Task 7: STAGING-DRY-RUN.md §5 — add escalation-boundary checks from PR #24

**Files:**
- Modify: `new-implementation/STAGING-DRY-RUN.md` (§5 only)

**Interfaces:** none (checklist doc).

**Context:** §5 predates PR #24's escalation-blocking fix. It checks cashier-can't-reach-admin-routes and cross-tenant isolation but not the boundary that shipped: a tenant `admin` must not self-assign/create `superadmin` and must get 403 on `POST /companies`. Verified behaviors to encode: `POST /companies` is `@Roles('superadmin')` (admin → 403); assigning `superadmin` via `POST /users` or `PATCH /users/:id/roles` throws `ForbiddenException('You cannot assign an elevated role.')`; `GET /users/roles/list` hides elevated roles from a non-elevated admin. Do NOT touch §4, §6, or §7.

- [ ] **Step 1: Add the escalation-boundary checklist items to §5**

Insert into §5 (`## 5. Smoke — security (RBAC + tenant isolation)`), after the tenant-isolation bullet and before the Pass gate line:

```markdown
- [ ] **Privilege-escalation boundary (PR #24):** as a tenant `admin` (not superadmin):
      - `POST /companies` → **403** (company create/delete is `superadmin`-only).
      - `GET /users/roles/list` → the response **omits `superadmin`** (elevated roles
        are hidden from non-elevated actors).
      - `POST /users` or `PATCH /users/:id/roles` attempting to grant `superadmin`
        → **403** `You cannot assign an elevated role.` (admin cannot self-escalate or
        mint a superadmin).
```

And extend the Pass gate line to include the new boundary:

```markdown
- **Pass gate:** zero cross-tenant data visible; cashier cannot reach admin routes;
  a tenant admin cannot create a company or assign/see the `superadmin` role.
```

- [ ] **Step 2: Verify only §5 changed**

Run: `git diff new-implementation/STAGING-DRY-RUN.md` and confirm the hunk is confined to §5 (no edits to §4, §6, §7).

- [ ] **Step 3: Commit**

```bash
git add new-implementation/STAGING-DRY-RUN.md
git commit -m "docs(staging): add escalation-boundary checks to §5 security smoke"
```

---

## Final Gate (after all tasks)

- [ ] Full unit suite: `docker run --rm -v "$PWD/new-implementation/backend:/app" -w /app node:20-alpine sh -c 'npm test 2>&1 | tail -8'` — expect 204 + new tests, 0 failures.
- [ ] Build: `docker run --rm -v "$PWD/new-implementation/backend:/app" -w /app node:20-alpine sh -c 'npm run build 2>&1 | tail -8'` — expect clean exit.
- [ ] superpowers:requesting-code-review on the full diff.
- [ ] Open PR against `main` (mergeable, not merged) summarizing all 7 items + the `accountant` reserved decision + the GitNexus deviation note.

## Self-Review Notes

- **Spec coverage:** Items 1–7 each map to Tasks 1–7 respectively. ✓
- **Placeholder scan:** Task 6 is intentionally procedural (real commands depend on live compose network name / throwaway secrets discovered at run time) — it specifies the exact tools, container images, and comparison method rather than fabricated network names. All code tasks (1,2,4,5) carry complete test code. ✓
- **Type consistency:** `extractRoleNames` used consistently in Task 2. `getDataSourceToken()` matches `@InjectDataSource()` in Task 5. `company_id` (orders/products) vs `companyId` (notifications) column-name difference is real and reflected per-service in Task 4. ✓
