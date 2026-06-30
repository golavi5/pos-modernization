# M4 — Legacy Migration Parity-Validation CLI Implementation Plan (v2, real-dump-driven)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the standalone TypeScript parity-validation CLI under `new-implementation/migration/` that imports the **real legacy Colombian POS dump** (`info/bd_ex.sql`) into the new schema and verifies field-by-field parity, exiting non-zero on any mismatch. The same code is the cutover tool.

**Architecture:** A standalone package (own `package.json`, off the backend's import graph) exposing a `migrate` CLI with `reset | import | verify | report` commands. Per-table declarative rules drive both import and verify. Legacy and target live as **two schemas in one MySQL instance** (`pos_legacy` + `pos_db_migration`) so verify uses a cross-schema JOIN. The target is provisioned by running the backend's **TypeORM migrations**. Deterministic UUIDv5 + a `legacy_id` join column make imports idempotent and diffs joinable.

**Tech Stack:** TypeScript 5, Node 22, `commander`, `mysql2`, `zod`, `chalk`, `uuid` (v5), `vitest`, `@testcontainers/mysql`, `typeorm` + `reflect-metadata` (reuse the backend `DataSource`).

## Global Constraints

- **Real source:** `info/bd_ex.sql` (232 MB, gitignored, MySQL `utf8mb3_spanish_ci`). It is a **representative sample**, not the frozen cutover dump — the success gate is "machine is correct against it"; the real production extract runs through the same code later. (Design Amendment §11 A3, updated.)
- **Source of truth = TypeORM migrations**, NOT `database/schema.sql` (superseded; divergent). Provision targets via `runMigrations()`.
- **Colocation:** legacy (`pos_legacy`) and target (`pos_db_migration`) are two schemas in the SAME MySQL server. `verify` JOINs across them. The CLI asserts same host:port for both before verify.
- **Charset:** legacy is `utf8mb3`; connect with `charset: 'utf8mb4'` and treat all text as utf8mb4 on insert. No mojibake transforms.
- **Fiscal/DIAN deferred to M5:** every fiscal table gets an explicit `skip` rule (config_plemsi, e_invoice_response, empresas_resoluciones, prefijos, documentos, payloads, clientes_tipodoc, clientes_tiporeg). Frozen dump ⇒ nothing lost; M5 re-migrates later.
- **Every one of the 47 legacy tables MUST have a rule (map or skip)** — the runner halts on any unclassified table (design §7.1 "deliberate acknowledgement").
- **Standalone package:** migration code MUST NOT be importable by the backend runtime. Dependency direction is migration→backend only.
- **Deterministic UUIDv5:** namespace constant + `source + ':' + legacyPk`. Same input → same UUID across runs.
- **`legacy_id`:** nullable `VARCHAR(64)` + UNIQUE index, added via a NEW TypeORM migration. Scoped to the 7 map targets: `customers, products, orders, order_items, payments, companies, users`. ⚠️ production-touching (runs on next prod deploy) — confirm at review.
- **Single-tenant assumption:** legacy `clientes`/`inventarios`/`usuarios` carry no company. All migrated rows are assigned ONE `company_id`, derived from the single migrated `empresas` row (`empresas` has ≤2 rows; confirm one). A bootstrap company UUID is the fallback.
- **Passwords:** legacy `usuarios.Clave` is a .NET hash, not bcrypt. Do NOT migrate it. Set a non-loginable placeholder; users reset on cutover.
- **Exit codes:** `0` all pass · `1` mismatch/missing row · `2` infrastructure error.
- **Committed test fixtures are synthetic-but-real-schema** (real Spanish table/column names, fake values) — NO real customer PII in git. Real-dump parity runs locally against `info/bd_ex.sql`.
- **Commits:** conventional commits, `migration:` scope (and `feat(db):` for the backend migration).

---

## ⚠️ Review gates before executing

1. **`legacy_id` on production tables (Task 3)** — the migration runs on the next prod deploy (`DB_RUN_MIGRATIONS=true`). Scope = `customers, products, orders, order_items, payments, companies, users`. Confirm.
2. **Single-tenant `company_id`** — confirm all legacy data maps to one company (the dump is one merchant). If multi-company, Tasks 8/9 need a per-row company resolver.

---

## Legacy → new mapping (authoritative)

| Legacy (utf8mb3) | PK | New target | Key transforms |
|---|---|---|---|
| `clientes` | `IdCliente` | `customers` | `name` = trim(`Nombre1 Nombre2 Apellido1 Apellido2`) or `RazonSocial`; `email`=lower; `EsActivo=0`→`deleted_at`; assign `company_id` |
| `inventarios` | `IdInventario` | `products` | `sku`=`CodInventario`; `cost`=`CostoPromedio`; `stock_quantity`=`CantFisica`; `tax_rate`=`Iva`; **`price`** = join `inventarios_precios` (lowest `IdLista`); `created_by`=bootstrap user; `company_id` |
| `encabezados` | `IdEncab` | `orders` | `order_number`=`NumDocumento`; `order_date`=`Fecha`; `EsAnulado=1`→status `CANCELLED` else `COMPLETED`; **`total_amount`/`subtotal`/`tax_amount`** = derived from `encabezados_mov` aggregate; `customer_id`=det.uuid(`clientes`,`IdCliente`); `company_id` |
| `encabezados_mov` | `IdEncabMov` | `order_items` | `order_id`=det.uuid(`encabezados`,`IdEncab`); `product_id`=det.uuid(`inventarios`,`IdInventario`); `quantity`=`Cant`; `unit_price`=`ValorUnit`; `subtotal`=`ValorSubTotal`; `tax_amount`=`ValorIva`; `total`=`ValorTotal` |
| `encabezados_pagodet` | `IdPago` | `payments` | `order_id`=det.uuid(`encabezados`,`IdEncab`); `amount`=`ValorPago`; `payment_date`=`FechaPago`; `payment_method`=`formaspago[IdFormaPago]`→enum |
| `usuarios` | `IdUsuario` | `users` | `email`=`CorreoElectronico`; name from `NomUsuario`; password=placeholder; `EsActivo`→active; `company_id` |
| `empresas` | `IdEmpresa` | `companies` | `name`=`Nombre`; `tax_id`=`Nit`; `address`/`phone`/`email` direct |

**Target enums:** `OrderStatus`=draft|pending|confirmed|completed|cancelled|voided · order `PaymentStatus`=unpaid|partially_paid|paid|refunded · payment `PaymentMethod`=cash|card|transfer|other · payment `PaymentStatus`=pending|completed|failed|refunded.

**Skip inventory (≈40 tables)** — see Task 8 Step 3 for the full list grouped as `fiscal-M5`, `reference`, `new-app-tables`.

---

### Task 1: Scaffold the standalone migration package

**Files:**
- Create: `new-implementation/migration/{package.json,tsconfig.json,vitest.config.ts,.env.example}`
- Create: `new-implementation/migration/{dumps/.gitkeep,reports/.gitkeep}`
- Modify: `.gitignore` (repo root)

**Interfaces:** Produces an installable, buildable package; `npm run test` runs vitest; `npm run build` emits `dist/`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@pos/migration",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": { "migrate": "dist/cli.js" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "migrate": "node --import tsx src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.1.0",
    "mysql2": "^3.11.0",
    "reflect-metadata": "^0.2.2",
    "typeorm": "^0.3.20",
    "uuid": "^10.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testcontainers/mysql": "^10.13.0",
    "@types/node": "^20.3.1",
    "@types/uuid": "^10.0.0",
    "testcontainers": "^10.13.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

> `core/provision.ts` imports backend source outside `rootDir`; do it via dynamic `import()` so `tsc -p` never compiles backend sources (loaded only by tsx/vitest).

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/**/*.spec.ts'], testTimeout: 120_000, hookTimeout: 120_000, pool: 'forks' },
});
```

- [ ] **Step 4: Create `.env.example`** (colocated legacy + target on one instance)

```bash
NODE_ENV=migration

# ONE MySQL instance, TWO schemas (required for verify JOIN).
DB_HOST=localhost
DB_PORT=3308
DB_USER=pos_user
DB_PASSWORD=

# Target schema (provisioned via TypeORM migrations). Name MUST end in _migration.
TARGET_DB_NAME=pos_db_migration
# Legacy schema (info/bd_ex.sql loaded here, read-only).
LEGACY_DB_NAME=pos_legacy
```

- [ ] **Step 5: Create `dumps/.gitkeep`, `reports/.gitkeep`** (empty).

- [ ] **Step 6: Append to repo-root `.gitignore`**

```gitignore

# M4 migration CLI
new-implementation/migration/node_modules/
new-implementation/migration/dist/
new-implementation/migration/.env
new-implementation/migration/dumps/*.sql
new-implementation/migration/reports/*
!new-implementation/migration/dumps/.gitkeep
!new-implementation/migration/reports/.gitkeep
```

> No new compose service. The legacy dump is loaded into a `pos_legacy` schema on the existing `mysql` service (port 3308) at run time (documented in Task 13). The e2e uses a single Testcontainer with both schemas — no dependence on compose.

- [ ] **Step 7: Install and verify**

Run: `cd new-implementation/migration && npm install && npm run build`
Expected: install + empty build succeed.

- [ ] **Step 8: Commit**

```bash
git add new-implementation/migration .gitignore
git commit -m "chore(migration): scaffold standalone M4 parity-validation package"
```

---

### Task 2: Type contracts (schema-first)

**Files:** Create `src/types/Rule.ts`, `src/types/Report.ts`.
**Interfaces:** Produces `Rule`/`FieldMap`/`IdMap`/`TransformCtx`/`MapRule`/`SkipRule` and `Report`/`RuleResult`/`RowResult`/`RowError`/`Mismatch`.

- [ ] **Step 1: Create `src/types/Rule.ts`**

```ts
export type VerifyMode = 'exact' | 'ignore' | { tolerance: number };

export type TransformCtx = {
  row: Record<string, unknown>;     // full legacy row
  source: string;                   // legacy table name
  lookups: Record<string, Map<string, any>>; // preloaded helper tables, keyed by name
  companyId: string;                // single-tenant company uuid
  bootstrapUserId: string;          // for NOT-NULL created_by
};

export type FieldMap = {
  from: string | null;              // legacy column; null = computed purely from ctx
  to: string;                       // target column
  transform?: (v: unknown, ctx: TransformCtx) => unknown;
  verify?: VerifyMode;              // default 'exact'
};

export type IdMap = { legacyKey: string; newKey: 'uuid-v4' | 'deterministic' };

export type MapRule = {
  kind: 'map';
  source: string; target: string;
  idMap: IdMap;
  fields: FieldMap[];
  dependsOn?: string[];
  maxRowErrors?: number;            // default 0
};

export type SkipRule = { kind: 'skip'; source: string; reason: string; category: 'fiscal-M5' | 'reference' | 'new-app-table' };

export type Rule = MapRule | SkipRule;
```

- [ ] **Step 2: Create `src/types/Report.ts`**

```ts
export type RowError = { rule: string; legacyPk: string; field?: string; cause: string };
export type Mismatch = { field: string; legacy: unknown; migrated: unknown };

export type RowResult =
  | { status: 'ok'; legacyPk: string }
  | { status: 'missing'; legacyPk: string }
  | { status: 'mismatch'; legacyPk: string; fields: Mismatch[] };

export type RuleStatus = 'passed' | 'partial' | 'failed' | 'skipped' | 'blocked_by_dependency';

export type RuleResult = {
  source: string; target?: string; status: RuleStatus;
  rowsImported?: number; rowsVerified?: number;
  mismatches: RowResult[]; errors: RowError[];
};

export type Report = {
  startedAt: string; phase: 'import' | 'verify';
  rules: RuleResult[];
  summary: { rules: number; mismatches: number; missing: number; errors: number };
  exitCode: 0 | 1 | 2;
};
```

- [ ] **Step 3: Commit**

```bash
git add new-implementation/migration/src/types
git commit -m "feat(migration): Rule + Report type contracts (real-dump shape)"
```

---

### Task 3: `legacy_id` TypeORM migration (backend) ⚠️ production-touching

**Files:** Create `new-implementation/backend/src/database/migrations/1781600000000-AddLegacyIdColumns.ts`. Validated by the e2e (Task 12).
**Interfaces:** Produces nullable `legacy_id VARCHAR(64)` + UNIQUE index on the 7 map targets.

- [ ] **Step 1: Confirm scope** (review gate): `customers, products, orders, order_items, payments, companies, users`.

- [ ] **Step 2: Write the migration**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = ['companies', 'customers', 'product_categories', 'products', 'users', 'orders', 'order_items', 'payments'];

export class AddLegacyIdColumns1781600000000 implements MigrationInterface {
  name = 'AddLegacyIdColumns1781600000000';
  public async up(q: QueryRunner): Promise<void> {
    for (const t of TABLES) {
      await q.query(`ALTER TABLE \`${t}\` ADD COLUMN \`legacy_id\` VARCHAR(64) NULL`);
      await q.query(`CREATE UNIQUE INDEX \`UQ_${t}_legacy_id\` ON \`${t}\` (\`legacy_id\`)`);
    }
  }
  public async down(q: QueryRunner): Promise<void> {
    for (const t of [...TABLES].reverse()) {
      await q.query(`DROP INDEX \`UQ_${t}_legacy_id\` ON \`${t}\``);
      await q.query(`ALTER TABLE \`${t}\` DROP COLUMN \`legacy_id\``);
    }
  }
}
```

> Includes `product_categories` for a future category mapping even though no map rule targets it yet — harmless nullable column, avoids a second prod migration later. Drop it from the list if you prefer strict minimalism. MySQL UNIQUE permits multiple NULLs, so non-migrated rows don't collide.

- [ ] **Step 3: Verify build + ordering**

Run: `cd new-implementation/backend && npm run build`
Expected: clean; timestamp `1781600000000` sorts after `1781578985277-InitialSchema`.

- [ ] **Step 4: Commit**

```bash
git add new-implementation/backend/src/database/migrations/1781600000000-AddLegacyIdColumns.ts
git commit -m "feat(db): add nullable legacy_id columns for M4 parity migration"
```

---

### Task 4: Deterministic UUIDv5 (`idMap`)

**Files:** Create `src/core/idMap.ts`; Test `tests/idMap.spec.ts`.
**Interfaces:** Produces `MIGRATION_NAMESPACE`, `deterministicId(source, pk)`, `newId(idMap, source, pk)`.

- [ ] **Step 1: Write the failing test** — `tests/idMap.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { deterministicId, newId } from '../src/core/idMap.js';

describe('idMap', () => {
  it('is stable across calls', () => {
    expect(deterministicId('clientes', '42')).toBe(deterministicId('clientes', '42'));
  });
  it('differs by source and pk', () => {
    expect(deterministicId('clientes', '42')).not.toBe(deterministicId('inventarios', '42'));
    expect(deterministicId('clientes', '42')).not.toBe(deterministicId('clientes', '43'));
  });
  it('numeric and string pk collapse', () => {
    expect(deterministicId('t', 7)).toBe(deterministicId('t', '7'));
  });
  it('uuid-v4 is valid and non-deterministic', () => {
    const a = newId({ legacyKey: 'id', newKey: 'uuid-v4' }, 't', '1');
    const b = newId({ legacyKey: 'id', newKey: 'uuid-v4' }, 't', '1');
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/idMap.spec.ts` → FAIL (module missing).

- [ ] **Step 3: Write `src/core/idMap.ts`**

```ts
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import type { IdMap } from '../types/Rule.js';

export const MIGRATION_NAMESPACE = '6f9619ff-8b86-d011-b42d-00c04fc964ff';

export function deterministicId(source: string, legacyPk: string | number): string {
  return uuidv5(`${source}:${String(legacyPk)}`, MIGRATION_NAMESPACE);
}
export function newId(idMap: IdMap, source: string, pk: string | number): string {
  return idMap.newKey === 'deterministic' ? deterministicId(source, pk) : uuidv4();
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run tests/idMap.spec.ts` → PASS (4).

- [ ] **Step 5: Commit**

```bash
git add new-implementation/migration/src/core/idMap.ts new-implementation/migration/tests/idMap.spec.ts
git commit -m "feat(migration): deterministic uuidv5 id mapping"
```

---

### Task 5: Transforms (date, name, money, status, payment-method) + `applyFields`

**Files:** Create `src/core/transforms.ts`, `src/core/applyFields.ts`; Test `tests/transforms.spec.ts`, `tests/applyFields.spec.ts`.
**Interfaces:**
- `parseLegacyDate(v): Date | null` — handles `datetime`, the legacy sentinel `'1000-01-01 00:00:00'`→null.
- `fullName(row): string` — concat `Nombre1..Apellido2`, fallback `RazonSocial`.
- `mapPaymentMethod(idFormaPago, ctx): PaymentMethodValue` — via `ctx.lookups.formaspago`.
- `applyFields(rule, row, newId, ctx): { target; errors }` — sets `target.id`, `target.legacy_id`.

- [ ] **Step 1: Write the failing test** — `tests/transforms.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parseLegacyDate, fullName } from '../src/core/transforms.js';

describe('parseLegacyDate', () => {
  it('parses a normal datetime as UTC', () => {
    expect(parseLegacyDate('2021-03-04 09:30:00')?.toISOString()).toBe('2021-03-04T09:30:00.000Z');
  });
  it('maps the legacy sentinel to null', () => {
    expect(parseLegacyDate('1000-01-01 00:00:00')).toBeNull();
  });
  it('throws on garbage', () => {
    expect(() => parseLegacyDate('banana')).toThrow();
  });
});

describe('fullName', () => {
  it('joins name parts and collapses whitespace', () => {
    expect(fullName({ Nombre1: 'Ana', Nombre2: '', Apellido1: 'Díaz', Apellido2: null })).toBe('Ana Díaz');
  });
  it('falls back to RazonSocial when no person name', () => {
    expect(fullName({ Nombre1: '', Apellido1: '', RazonSocial: 'Tienda SAS' })).toBe('Tienda SAS');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/transforms.spec.ts` → FAIL.

- [ ] **Step 3: Write `src/core/transforms.ts`**

```ts
import type { TransformCtx } from '../types/Rule.js';

const SENTINELS = new Set(['1000-01-01 00:00:00', '0000-00-00 00:00:00']);

export function parseLegacyDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  if (SENTINELS.has(s)) return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s) ? s.replace(' ', 'T') + 'Z' : s;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`unparseable date: ${JSON.stringify(v)}`);
  return d;
}

export function fullName(row: Record<string, unknown>): string {
  const parts = ['Nombre1', 'Nombre2', 'Apellido1', 'Apellido2']
    .map((k) => String(row[k] ?? '').trim()).filter(Boolean);
  const person = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (person) return person;
  const razon = String(row['RazonSocial'] ?? '').trim();
  return razon || 'Sin nombre';
}

// IdFormaPago → PaymentMethod enum. The lookup map is built from the legacy
// formaspago table (Task 8 loads it). Heuristic by name; unknown → 'other'.
export function mapPaymentMethod(idFormaPago: unknown, ctx: TransformCtx): string {
  const row = ctx.lookups.formaspago?.get(String(idFormaPago));
  const name = String(row?.NomFormaPago ?? '').toLowerCase();
  if (/efectivo|cash/.test(name)) return 'cash';
  if (/tarjeta|card|credito|debito/.test(name)) return 'card';
  if (/transfer|consign|nequi|daviplata|pse/.test(name)) return 'transfer';
  return 'other';
}
```

- [ ] **Step 4: Write `tests/applyFields.spec.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { applyFields } from '../src/core/applyFields.js';
import { fullName, parseLegacyDate } from '../src/core/transforms.js';
import type { MapRule, TransformCtx } from '../src/types/Rule.js';

const ctx: TransformCtx = { row: {}, source: 'clientes', lookups: {}, companyId: 'co-1', bootstrapUserId: 'u-1' };

const rule: MapRule = {
  kind: 'map', source: 'clientes', target: 'customers',
  idMap: { legacyKey: 'IdCliente', newKey: 'deterministic' },
  fields: [
    { from: null,        to: 'company_id', transform: (_v, c) => c.companyId },
    { from: null,        to: 'name',       transform: (_v, c) => fullName(c.row) },
    { from: 'Email',     to: 'email',      transform: (v) => String(v ?? '').toLowerCase().trim() || null },
    { from: 'FechaCreacion', to: 'created_at', transform: parseLegacyDate, verify: 'ignore' },
  ],
};

describe('applyFields', () => {
  it('maps computed + transformed fields and injects id/legacy_id', () => {
    const row = { IdCliente: 7, Nombre1: 'Ana', Apellido1: 'Díaz', Email: ' A@B.CO ', FechaCreacion: '2021-03-04 00:00:00' };
    const { target, errors } = applyFields(rule, row, 'uuid-here', { ...ctx, row });
    expect(errors).toEqual([]);
    expect(target).toMatchObject({ id: 'uuid-here', legacy_id: '7', company_id: 'co-1', name: 'Ana Díaz', email: 'a@b.co' });
  });
  it('collects a RowError when a transform throws', () => {
    const row = { IdCliente: 8, Nombre1: 'Bo', FechaCreacion: 'not-a-date' };
    const { errors } = applyFields(rule, row, 'u2', { ...ctx, row });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ rule: 'clientes', legacyPk: '8', field: 'created_at' });
  });
});
```

- [ ] **Step 5: Write `src/core/applyFields.ts`**

```ts
import type { MapRule, TransformCtx } from '../types/Rule.js';
import type { RowError } from '../types/Report.js';

export function applyFields(
  rule: MapRule, row: Record<string, unknown>, newId: string, ctx: TransformCtx,
): { target: Record<string, unknown>; errors: RowError[] } {
  const errors: RowError[] = [];
  const legacyPk = String(row[rule.idMap.legacyKey]);
  const target: Record<string, unknown> = { id: newId, legacy_id: legacyPk };

  for (const f of rule.fields) {
    if (f.to === 'legacy_id') continue;
    const raw = f.from == null ? null : row[f.from];
    try {
      target[f.to] = f.transform ? f.transform(raw, ctx) : raw;
    } catch (e) {
      errors.push({ rule: rule.source, legacyPk, field: f.to, cause: e instanceof Error ? e.message : String(e) });
    }
  }
  return { target, errors };
}
```

- [ ] **Step 6: Run to verify pass** — `npx vitest run tests/transforms.spec.ts tests/applyFields.spec.ts` → PASS (7).

- [ ] **Step 7: Commit**

```bash
git add new-implementation/migration/src/core/transforms.ts new-implementation/migration/src/core/applyFields.ts new-implementation/migration/tests/transforms.spec.ts new-implementation/migration/tests/applyFields.spec.ts
git commit -m "feat(migration): legacy transforms (date/name/payment) + applyFields"
```

---

### Task 6: Differ

**Files:** Create `src/core/differ.ts`; Test `tests/differ.spec.ts`.
**Interfaces:** `compare(legacyPk, expectedRow, migratedRow | null, fields, ctx): RowResult` — `expectedRow` is the **already-transformed** expected target row (the verify step transforms legacy → expected, then diffs against DB). Honors `verify` modes.

> Design change from v1: the differ compares a pre-computed expected row against the DB row, instead of re-running transforms internally. This keeps transform logic in one place (`applyFields`) and lets verify reuse it.

- [ ] **Step 1: Write the failing test** — `tests/differ.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { compare } from '../src/core/differ.js';
import type { FieldMap } from '../src/types/Rule.js';

const fields: FieldMap[] = [
  { from: 'Name', to: 'name', verify: 'exact' },
  { from: 'Price', to: 'price', verify: { tolerance: 0.01 } },
  { from: 'X', to: 'updated_at', verify: 'ignore' },
];

describe('differ.compare', () => {
  it('missing when migrated row is null', () => {
    expect(compare('1', { name: 'x', price: 1, updated_at: 'a' }, null, fields)).toEqual({ status: 'missing', legacyPk: '1' });
  });
  it('ok when compared fields match', () => {
    expect(compare('1', { name: 'Ana', price: 10, updated_at: 'a' },
                        { name: 'Ana', price: 10, updated_at: 'b' }, fields).status).toBe('ok');
  });
  it('flags exact mismatch, respects tolerance + ignore', () => {
    const r = compare('1', { name: 'Ana', price: 10.005, updated_at: 'a' },
                            { name: 'Bob', price: 10.00, updated_at: 'zzz' }, fields);
    expect(r.status).toBe('mismatch');
    if (r.status === 'mismatch') expect(r.fields.map((f) => f.field)).toEqual(['name']);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/differ.spec.ts` → FAIL.

- [ ] **Step 3: Write `src/core/differ.ts`**

```ts
import type { FieldMap } from '../types/Rule.js';
import type { RowResult, Mismatch } from '../types/Report.js';

function norm(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v === null || v === undefined) return null;
  return v;
}

export function compare(
  legacyPk: string,
  expected: Record<string, unknown>,
  migrated: Record<string, unknown> | null,
  fields: FieldMap[],
): RowResult {
  if (migrated === null) return { status: 'missing', legacyPk };
  const mismatches: Mismatch[] = [];
  for (const f of fields) {
    const mode = f.verify ?? 'exact';
    if (mode === 'ignore' || f.to === 'legacy_id') continue;
    const e = norm(expected[f.to]); const a = norm(migrated[f.to]);
    if (typeof mode === 'object' && 'tolerance' in mode) {
      if (Math.abs(Number(e) - Number(a)) > mode.tolerance) mismatches.push({ field: f.to, legacy: e, migrated: a });
    } else if (String(e) !== String(a)) {
      mismatches.push({ field: f.to, legacy: e, migrated: a });
    }
  }
  return mismatches.length ? { status: 'mismatch', legacyPk, fields: mismatches } : { status: 'ok', legacyPk };
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run tests/differ.spec.ts` → PASS (3).

- [ ] **Step 5: Commit**

```bash
git add new-implementation/migration/src/core/differ.ts new-implementation/migration/tests/differ.spec.ts
git commit -m "feat(migration): differ comparing pre-transformed expected vs migrated"
```

---

### Task 7: Topological sort + cycle detection

**Files:** Create `src/core/topo.ts`; Test `tests/topo.spec.ts`.
**Interfaces:** `topoSort(nodes, edges): string[]` — dependency before dependent; throws naming the cycle.

- [ ] **Step 1: Write the failing test** — `tests/topo.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { topoSort } from '../src/core/topo.js';

describe('topoSort', () => {
  it('orders dependencies first', () => {
    const o = topoSort(['encabezados_pagodet', 'encabezados', 'clientes'],
      { encabezados_pagodet: ['encabezados'], encabezados: ['clientes'], clientes: [] });
    expect(o.indexOf('clientes')).toBeLessThan(o.indexOf('encabezados'));
    expect(o.indexOf('encabezados')).toBeLessThan(o.indexOf('encabezados_pagodet'));
  });
  it('throws naming the cycle', () => {
    expect(() => topoSort(['a', 'b'], { a: ['b'], b: ['a'] })).toThrow(/cycle/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/topo.spec.ts` → FAIL.

- [ ] **Step 3: Write `src/core/topo.ts`**

```ts
export function topoSort(nodes: string[], edges: Record<string, string[]>): string[] {
  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (n: string, path: string[]): void => {
    const s = state.get(n);
    if (s === 'done') return;
    if (s === 'visiting') throw new Error(`dependency cycle: ${[...path, n].join(' -> ')}`);
    state.set(n, 'visiting');
    for (const dep of edges[n] ?? []) {
      if (!nodes.includes(dep)) throw new Error(`unknown dependency "${dep}" required by "${n}"`);
      visit(dep, [...path, n]);
    }
    state.set(n, 'done'); order.push(n);
  };
  for (const n of nodes) visit(n, []);
  return order;
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run tests/topo.spec.ts` → PASS (2).

- [ ] **Step 5: Commit**

```bash
git add new-implementation/migration/src/core/topo.ts new-implementation/migration/tests/topo.spec.ts
git commit -m "feat(migration): topological rule ordering with cycle detection"
```

---

### Task 8: Real rule files + skip inventory + registry

**Files:**
- Create: `src/rules/{customers,products,orders,order-items,payments,users,companies}.rule.ts`
- Create: `src/rules/_skips.ts` (≈40 skip rules)
- Create: `src/rules/_registry.ts`
- Test: `tests/rules.spec.ts`

**Interfaces:**
- Consumes: `Rule`/`MapRule`/`SkipRule` (Task 2), `topoSort` (Task 7), transforms (Task 5), `deterministicId` (Task 4).
- Produces: `RULES: Rule[]`; `ruleOrder(): MapRule[]` (topo); `ruleBySource: Map<string, Rule>`; `allLegacyTables: string[]` (map+skip union, for the pre-flight unknown-table check).

> **Investigative sub-step:** the exact `formaspago` id→name rows and `documentos` doc-type filter need confirming against `info/bd_ex.sql` (multi-line INSERTs — load into MySQL or parse). `mapPaymentMethod` is name-heuristic so it tolerates unknown ids (→'other'); confirm the heuristic covers the real `NomFormaPago` values and add explicit cases if not. Document findings in the rule file comments.

- [ ] **Step 1: Write `src/rules/companies.rule.ts`** (no deps — migrate first; provides the tenant)

```ts
import type { Rule } from '../types/Rule.js';
export default {
  kind: 'map', source: 'empresas', target: 'companies',
  idMap: { legacyKey: 'IdEmpresa', newKey: 'deterministic' },
  fields: [
    { from: 'Nombre',   to: 'name',    verify: 'exact' },
    { from: 'Nit',      to: 'tax_id',  verify: 'exact' },
    { from: 'Direccion', to: 'address', verify: 'exact' },
    { from: 'Telefono', to: 'phone',   verify: 'exact' },
    { from: 'Email',    to: 'email',   transform: (v) => String(v ?? '').toLowerCase().trim() || null },
    { from: 'EsActivo', to: 'is_active', transform: (v) => !!Number(v), verify: 'ignore' },
  ],
} satisfies Rule;
```

- [ ] **Step 2: Write the remaining 6 map rules.** Full field sets — `customers`, `users`, `products`, `orders`, `order-items`, `payments`. Examples (author the rest in the same shape, columns per the mapping table):

```ts
// customers.rule.ts — depends on companies
import type { Rule } from '../types/Rule.js';
import { fullName, parseLegacyDate } from '../core/transforms.js';
export default {
  kind: 'map', source: 'clientes', target: 'customers', dependsOn: ['empresas'],
  idMap: { legacyKey: 'IdCliente', newKey: 'deterministic' },
  fields: [
    { from: null,      to: 'company_id', transform: (_v, c) => c.companyId },
    { from: null,      to: 'name',       transform: (_v, c) => fullName(c.row) },
    { from: 'Email',   to: 'email',      transform: (v) => String(v ?? '').toLowerCase().trim() || null },
    { from: 'Telefono', to: 'phone',     verify: 'exact' },
    { from: 'Direccion', to: 'address',  verify: 'exact' },
    { from: 'EsActivo', to: 'deleted_at', transform: (v) => Number(v) ? null : new Date(), verify: 'ignore' },
    { from: 'FechaCreacion', to: 'created_at', transform: parseLegacyDate, verify: 'ignore' },
  ],
} satisfies Rule;
```

```ts
// products.rule.ts — depends on companies; price from inventarios_precios lookup
import type { Rule } from '../types/Rule.js';
export default {
  kind: 'map', source: 'inventarios', target: 'products', dependsOn: ['empresas'],
  idMap: { legacyKey: 'IdInventario', newKey: 'deterministic' },
  fields: [
    { from: null,            to: 'company_id', transform: (_v, c) => c.companyId },
    { from: null,            to: 'created_by', transform: (_v, c) => c.bootstrapUserId },
    { from: 'NomInventario', to: 'name',       verify: 'exact' },
    { from: 'CodInventario', to: 'sku',        verify: 'exact' },
    { from: 'CodigoBarras',  to: 'barcode',    transform: (v) => v || null },
    { from: 'CostoPromedio', to: 'cost',       verify: { tolerance: 0.01 } },
    { from: 'CantFisica',    to: 'stock_quantity', transform: (v) => Math.trunc(Number(v)), verify: 'exact' },
    { from: 'Iva',           to: 'tax_rate',   transform: (v) => Number(v), verify: { tolerance: 0.01 } },
    // price: lowest IdLista entry from inventarios_precios for this IdInventario
    { from: 'IdInventario',  to: 'price', verify: { tolerance: 0.01 },
      transform: (v, c) => { const p = c.lookups.inventarios_precios?.get(String(v)); return p ? Number(p.Precio) : 0; } },
    { from: 'EsActivo',      to: 'is_active', transform: (v) => !!Number(v), verify: 'ignore' },
  ],
} satisfies Rule;
```

```ts
// orders.rule.ts — depends on customers; totals derived from encabezados_mov
import type { Rule } from '../types/Rule.js';
import { deterministicId } from '../core/idMap.js';
import { parseLegacyDate } from '../core/transforms.js';
export default {
  kind: 'map', source: 'encabezados', target: 'orders', dependsOn: ['clientes'],
  idMap: { legacyKey: 'IdEncab', newKey: 'deterministic' },
  fields: [
    { from: null,          to: 'company_id', transform: (_v, c) => c.companyId },
    { from: 'IdCliente',   to: 'customer_id', transform: (v) => v == null ? null : deterministicId('clientes', String(v)) },
    { from: 'NumDocumento', to: 'order_number', transform: (v) => String(v) },
    { from: 'Fecha',       to: 'order_date',  transform: parseLegacyDate },
    { from: 'EsAnulado',   to: 'status', transform: (v) => Number(v) ? 'cancelled' : 'completed' },
    // subtotal/tax/total derived from the order's lines (ctx.lookups.mov_totals keyed by IdEncab)
    { from: 'IdEncab',     to: 'subtotal',     verify: { tolerance: 0.01 },
      transform: (v, c) => Number(c.lookups.mov_totals?.get(String(v))?.subtotal ?? 0) },
    { from: 'IdEncab',     to: 'tax_amount',   verify: { tolerance: 0.01 },
      transform: (v, c) => Number(c.lookups.mov_totals?.get(String(v))?.tax ?? 0) },
    { from: 'IdEncab',     to: 'total_amount', verify: { tolerance: 0.01 },
      transform: (v, c) => Number(c.lookups.mov_totals?.get(String(v))?.total ?? 0) },
  ],
} satisfies Rule;
```

```ts
// order-items.rule.ts — depends on orders + products
import type { Rule } from '../types/Rule.js';
import { deterministicId } from '../core/idMap.js';
export default {
  kind: 'map', source: 'encabezados_mov', target: 'order_items', dependsOn: ['encabezados', 'inventarios'],
  idMap: { legacyKey: 'IdEncabMov', newKey: 'deterministic' },
  fields: [
    { from: 'IdEncab',      to: 'order_id',   transform: (v) => deterministicId('encabezados', String(v)) },
    { from: 'IdInventario', to: 'product_id', transform: (v) => deterministicId('inventarios', String(v)) },
    { from: 'Cant',         to: 'quantity',   transform: (v) => Math.trunc(Number(v)), verify: 'exact' },
    { from: 'ValorUnit',    to: 'unit_price', verify: { tolerance: 0.01 } },
    { from: 'ValorSubTotal', to: 'subtotal',  verify: { tolerance: 0.01 } },
    { from: 'ValorIva',     to: 'tax_amount', verify: { tolerance: 0.01 } },
    { from: 'ValorTotal',   to: 'total',      verify: { tolerance: 0.01 } },
  ],
} satisfies Rule;
```

```ts
// payments.rule.ts — depends on orders; method via formaspago lookup
import type { Rule } from '../types/Rule.js';
import { deterministicId } from '../core/idMap.js';
import { parseLegacyDate, mapPaymentMethod } from '../core/transforms.js';
export default {
  kind: 'map', source: 'encabezados_pagodet', target: 'payments', dependsOn: ['encabezados'],
  idMap: { legacyKey: 'IdPago', newKey: 'deterministic' },
  fields: [
    { from: 'IdEncab',     to: 'order_id',       transform: (v) => deterministicId('encabezados', String(v)) },
    { from: 'ValorPago',   to: 'amount',         verify: { tolerance: 0.01 } },
    { from: 'FechaPago',   to: 'payment_date',   transform: parseLegacyDate },
    { from: 'IdFormaPago', to: 'payment_method', transform: (v, c) => mapPaymentMethod(v, c) },
  ],
} satisfies Rule;
```

```ts
// users.rule.ts — depends on companies; password NOT migrated
import type { Rule } from '../types/Rule.js';
export const PLACEHOLDER_PASSWORD_HASH = '$2b$10$migrationplaceholderplaceholderplaceholderplaceholder';
export default {
  kind: 'map', source: 'usuarios', target: 'users', dependsOn: ['empresas'],
  idMap: { legacyKey: 'IdUsuario', newKey: 'deterministic' },
  fields: [
    { from: null,              to: 'company_id', transform: (_v, c) => c.companyId },
    { from: 'CorreoElectronico', to: 'email',    transform: (v) => String(v ?? '').toLowerCase().trim() || null },
    { from: 'NomUsuario',      to: 'name',       verify: 'exact' },
    { from: null,              to: 'password',   transform: () => PLACEHOLDER_PASSWORD_HASH, verify: 'ignore' },
    { from: 'EsActivo',        to: 'is_active',  transform: (v) => !!Number(v), verify: 'ignore' },
  ],
} satisfies Rule;
```

> `users`/`customers` exact target columns (e.g. is the user name column `name` or `full_name`? does `users` have `company_id`/`is_active`?) MUST be confirmed against the actual entities before finalizing — read `modules/users/entities/*.entity.ts` and `modules/auth/entities/*` at execution. Adjust `to:` names to match. This is the one place the plan defers to entity inspection; do it, don't guess.

- [ ] **Step 3: Write `src/rules/_skips.ts`** (every non-mapped legacy table)

```ts
import type { SkipRule } from '../types/Rule.js';
const fiscal = ['config_plemsi', 'e_invoice_response', 'empresas_resoluciones', 'prefijos', 'documentos', 'payloads', 'clientes_tipodoc', 'clientes_tiporeg'];
const reference = ['formaspago', 'ciudades', 'departamentos', 'paises', 'monedas', 'inventarios_abc', 'inventarios_agrup1', 'inventarios_clasifimpto', 'inventarios_formulas', 'inventarios_kardex', 'inventarios_listas', 'inventarios_precios', 'inventarios_tipos', 'inventarios_unidades', 'inventarios_unidades_tipos', 'clientes_agrup1', 'usuariostipo', 'usuario_systemconfig', 'puntos', 'puntosmov', 'arqueo_cajas', 'encabezados_costos', 'Logs'];
const newApp = ['customers', 'orders', 'order_items', 'products', 'users', 'roles', 'userclaims', 'userlogins', 'userroles'];

export const SKIPS: SkipRule[] = [
  ...fiscal.map((s): SkipRule => ({ kind: 'skip', source: s, category: 'fiscal-M5', reason: 'DIAN fiscal subsystem — deferred to M5.' })),
  ...reference.map((s): SkipRule => ({ kind: 'skip', source: s, category: 'reference', reason: 'Catalog/reference table with no new-schema target (lookups consumed inline during map).' })),
  ...newApp.map((s): SkipRule => ({ kind: 'skip', source: s, category: 'new-app-table', reason: 'New-app / ASP.NET Identity table present in the dump; not a legacy source.' })),
];
```

> `inventarios_precios`, `inventarios_listas`, `formaspago` are listed as `reference` skips (their own target is nothing) but are **read as lookups** during the products/payments map (Task 9 preloads them). The three lists total 7 maps + 8 fiscal + 23 reference + 9 new-app = 47 — every legacy table.

- [ ] **Step 4: Write `src/rules/_registry.ts`**

```ts
import type { Rule, MapRule } from '../types/Rule.js';
import { topoSort } from '../core/topo.js';
import { SKIPS } from './_skips.js';
import companies from './companies.rule.js';
import customers from './customers.rule.js';
import products from './products.rule.js';
import orders from './orders.rule.js';
import orderItems from './order-items.rule.js';
import payments from './payments.rule.js';
import users from './users.rule.js';

const MAPS: MapRule[] = [companies, customers, products, orders, orderItems, payments, users] as MapRule[];
export const RULES: Rule[] = [...MAPS, ...SKIPS];
export const ruleBySource = new Map<string, Rule>(RULES.map((r) => [r.source, r]));
export const allLegacyTables: string[] = RULES.map((r) => r.source);

export function ruleOrder(): MapRule[] {
  const names = MAPS.map((r) => r.source);
  const edges: Record<string, string[]> = {};
  for (const r of MAPS) edges[r.source] = (r.dependsOn ?? []).filter((d) => names.includes(d));
  return topoSort(names, edges).map((s) => MAPS.find((r) => r.source === s)!);
}
```

- [ ] **Step 5: Write `tests/rules.spec.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { RULES, ruleOrder, ruleBySource, allLegacyTables } from '../src/rules/_registry.js';

const LEGACY_47 = 'Logs arqueo_cajas ciudades clientes clientes_agrup1 clientes_tipodoc clientes_tiporeg config_plemsi customers departamentos documentos e_invoice_response empresas empresas_resoluciones encabezados encabezados_costos encabezados_mov encabezados_pagodet formaspago inventarios inventarios_abc inventarios_agrup1 inventarios_clasifimpto inventarios_formulas inventarios_kardex inventarios_listas inventarios_precios inventarios_tipos inventarios_unidades inventarios_unidades_tipos monedas order_items orders paises payloads prefijos products puntos puntosmov roles userclaims userlogins userroles users usuario_systemconfig usuarios usuariostipo'.split(' ');

describe('rule registry', () => {
  it('covers every one of the 47 legacy tables (map or skip)', () => {
    for (const t of LEGACY_47) expect(ruleBySource.has(t), `missing rule for ${t}`).toBe(true);
    expect(new Set(allLegacyTables).size).toBe(allLegacyTables.length); // no dupes
  });
  it('orders parents before children', () => {
    const o = ruleOrder().map((r) => r.source);
    expect(o.indexOf('empresas')).toBeLessThan(o.indexOf('clientes'));
    expect(o.indexOf('clientes')).toBeLessThan(o.indexOf('encabezados'));
    expect(o.indexOf('encabezados')).toBeLessThan(o.indexOf('encabezados_mov'));
    expect(o.indexOf('inventarios')).toBeLessThan(o.indexOf('encabezados_mov'));
  });
  it('maps target only authoritative new tables', () => {
    const valid = new Set(['companies','customers','products','orders','order_items','payments','users']);
    for (const r of RULES) if (r.kind === 'map') expect(valid.has(r.target)).toBe(true);
  });
});
```

- [ ] **Step 6: Run to verify pass** — `npx vitest run tests/rules.spec.ts` → PASS (3). (If "missing rule for formaspago", add it to `_skips.ts` reference list per Step 3 note.)

- [ ] **Step 7: Commit**

```bash
git add new-implementation/migration/src/rules new-implementation/migration/tests/rules.spec.ts
git commit -m "feat(migration): real legacy->new rules + full skip inventory + registry"
```

---

### Task 9: DB clients, lookups preload, provisioning

**Files:** Create `src/core/{targetDb,legacyDb,lookups,provision}.ts`; Test `tests/provision.spec.ts`.
**Interfaces:**
- `assertMigrationDb(name)`; `pool()` — ONE mysql2 pool (multi-schema; `database` unset, charset utf8mb4) used for both schemas via qualified names.
- `loadLookups(pool, legacySchema): Promise<TransformCtx['lookups']>` — preloads `formaspago`, `inventarios_precios` (lowest IdLista per IdInventario), and `mov_totals` (per-IdEncab aggregate of `encabezados_mov`).
- `provisionTarget(conn): Promise<void>` — drop/recreate target schema + run backend TypeORM migrations.
- `resolveTenant(pool, legacySchema): Promise<{ companyId, bootstrapUserId }>`.

- [ ] **Step 1: Write the failing test** — `tests/provision.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { assertMigrationDb } from '../src/core/targetDb.js';
describe('assertMigrationDb', () => {
  it('accepts a _migration database', () => { expect(() => assertMigrationDb('pos_db_migration')).not.toThrow(); });
  it('rejects prod (safety rail)', () => { expect(() => assertMigrationDb('pos_db')).toThrow(/_migration/); });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/provision.spec.ts` → FAIL.

- [ ] **Step 3: Write `src/core/targetDb.ts`**

```ts
import mysql, { type Pool } from 'mysql2/promise';

export function assertMigrationDb(name: string): void {
  if (!/_migration$/.test(name)) throw new Error(`refusing to operate on "${name}": target DB name must end in _migration`);
}
// One pool, no default schema — legacy + target referenced by qualified name.
export function pool(): Pool {
  return mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3308),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    charset: 'utf8mb4', dateStrings: false, multipleStatements: false,
  });
}
export const targetSchema = () => { const n = process.env.TARGET_DB_NAME ?? 'pos_db_migration'; assertMigrationDb(n); return n; };
export const legacySchema = () => process.env.LEGACY_DB_NAME ?? 'pos_legacy';
```

- [ ] **Step 4: Write `src/core/lookups.ts`**

```ts
import type { Pool } from 'mysql2/promise';

export async function loadLookups(p: Pool, legacy: string) {
  const formaspago = new Map<string, any>();
  for (const r of (await p.query<any[]>(`SELECT * FROM \`${legacy}\`.formaspago`))[0]) formaspago.set(String(r.IdFormaPago), r);

  // lowest IdLista price per product
  const inventarios_precios = new Map<string, any>();
  const [prices] = await p.query<any[]>(`SELECT ip.* FROM \`${legacy}\`.inventarios_precios ip
     JOIN (SELECT IdInventario, MIN(IdLista) lista FROM \`${legacy}\`.inventarios_precios GROUP BY IdInventario) m
       ON m.IdInventario = ip.IdInventario AND m.lista = ip.IdLista`);
  for (const r of prices) inventarios_precios.set(String(r.IdInventario), r);

  // per-order aggregate from lines
  const mov_totals = new Map<string, any>();
  const [tot] = await p.query<any[]>(`SELECT IdEncab,
      SUM(ValorSubTotal) subtotal, SUM(ValorIva) tax, SUM(ValorTotal) total
      FROM \`${legacy}\`.encabezados_mov GROUP BY IdEncab`);
  for (const r of tot) mov_totals.set(String(r.IdEncab), r);

  return { formaspago, inventarios_precios, mov_totals };
}
```

- [ ] **Step 5: Write `src/core/legacyDb.ts`** (tenant resolver)

```ts
import type { Pool } from 'mysql2/promise';
import { deterministicId } from './idMap.js';

export async function resolveTenant(p: Pool, legacy: string): Promise<{ companyId: string; bootstrapUserId: string }> {
  const [emp] = await p.query<any[]>(`SELECT IdEmpresa FROM \`${legacy}\`.empresas ORDER BY IdEmpresa LIMIT 1`);
  if (!emp.length) throw new Error('no empresas row found — cannot resolve tenant');
  const [usr] = await p.query<any[]>(`SELECT IdUsuario FROM \`${legacy}\`.usuarios ORDER BY IdUsuario LIMIT 1`);
  return {
    companyId: deterministicId('empresas', String(emp[0].IdEmpresa)),
    bootstrapUserId: usr.length ? deterministicId('usuarios', String(usr[0].IdUsuario)) : deterministicId('empresas', String(emp[0].IdEmpresa)),
  };
}
```

- [ ] **Step 6: Write `src/core/provision.ts`**

```ts
import 'reflect-metadata';
import mysql from 'mysql2/promise';
import { assertMigrationDb } from './targetDb.js';

export type TargetConn = { host: string; port: number; user: string; password: string; database: string };

export async function provisionTarget(conn: TargetConn): Promise<void> {
  assertMigrationDb(conn.database);
  const admin = await mysql.createConnection({ host: conn.host, port: conn.port, user: conn.user, password: conn.password, multipleStatements: true });
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${conn.database}\``);
    await admin.query(`CREATE DATABASE \`${conn.database}\` CHARACTER SET utf8mb4`);
  } finally { await admin.end(); }

  const { dataSourceOptions } = await import('../../../backend/src/database/data-source.js') as typeof import('../../../backend/src/database/data-source.js');
  const { DataSource } = await import('typeorm');
  const ds = new (DataSource as any)({ ...dataSourceOptions, host: conn.host, port: conn.port, username: conn.user, password: conn.password, database: conn.database, synchronize: false, migrationsRun: false });
  await ds.initialize();
  try { await ds.runMigrations({ transaction: 'all' }); } finally { await ds.destroy(); }
}
```

- [ ] **Step 7: Run to verify pass** — `npx vitest run tests/provision.spec.ts` → PASS (2). Full provisioning runs in the e2e.

- [ ] **Step 8: Commit**

```bash
git add new-implementation/migration/src/core/targetDb.ts new-implementation/migration/src/core/lookups.ts new-implementation/migration/src/core/legacyDb.ts new-implementation/migration/src/core/provision.ts new-implementation/migration/tests/provision.spec.ts
git commit -m "feat(migration): pool, lookups preload, tenant resolver, TypeORM provisioning"
```

---

### Task 10: Reporter (JSON + HTML)

**Files:** Create `src/core/reporter.ts`; Test `tests/reporter.spec.ts`.
**Interfaces:** `buildReport(phase, results, startedAt): Report`; `renderHtml(report): string`; `writeReport(dir, report): Promise<{jsonPath; htmlPath}>`.

- [ ] **Step 1: Write the failing test** — `tests/reporter.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { buildReport, renderHtml } from '../src/core/reporter.js';
import type { RuleResult } from '../src/types/Report.js';

const results: RuleResult[] = [
  { source: 'clientes', target: 'customers', status: 'passed', rowsVerified: 3, mismatches: [], errors: [] },
  { source: 'encabezados', target: 'orders', status: 'failed', rowsVerified: 2, errors: [],
    mismatches: [{ status: 'missing', legacyPk: '9' }, { status: 'mismatch', legacyPk: '8', fields: [{ field: 'total_amount', legacy: 10, migrated: 9 }] }] },
];

describe('buildReport', () => {
  it('aggregates and sets exitCode 1 on mismatch/missing', () => {
    const r = buildReport('verify', results, '2026-06-29T00:00:00.000Z');
    expect(r.summary).toEqual({ rules: 2, mismatches: 1, missing: 1, errors: 0 });
    expect(r.exitCode).toBe(1);
  });
  it('exitCode 0 when all pass', () => {
    expect(buildReport('verify', [results[0]], '2026-06-29T00:00:00.000Z').exitCode).toBe(0);
  });
  it('renders self-contained HTML mentioning each rule', () => {
    const html = renderHtml(buildReport('verify', results, '2026-06-29T00:00:00.000Z'));
    expect(html).toContain('<html'); expect(html).toContain('encabezados'); expect(html).not.toContain('<script');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — → FAIL.

- [ ] **Step 3: Write `src/core/reporter.ts`** (same as the proven v1 implementation)

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Report, RuleResult } from '../types/Report.js';

export function buildReport(phase: 'import' | 'verify', results: RuleResult[], startedAt: string): Report {
  let mismatches = 0, missing = 0, errors = 0;
  for (const r of results) {
    errors += r.errors.length;
    for (const m of r.mismatches) { if (m.status === 'missing') missing++; else if (m.status === 'mismatch') mismatches++; }
  }
  const failed = results.some((r) => r.status === 'failed' || r.status === 'blocked_by_dependency');
  const exitCode: 0 | 1 | 2 = (mismatches || missing || failed) ? 1 : 0;
  return { startedAt, phase, rules: results, summary: { rules: results.length, mismatches, missing, errors }, exitCode };
}

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function renderHtml(report: Report): string {
  const rows = report.rules.map((r) => `<tr class="${esc(r.status)}"><td>${esc(r.source)}</td><td>${esc(r.target ?? '—')}</td><td>${esc(r.status)}</td><td>${esc(r.rowsVerified ?? r.rowsImported ?? 0)}</td><td>${r.mismatches.length}</td><td>${r.errors.length}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>M4 Parity — ${esc(report.phase)}</title>
<style>body{font:14px system-ui;margin:2rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}.failed,.blocked_by_dependency{background:#fde}.partial{background:#ffd}.passed{background:#efe}</style></head><body>
<h1>M4 Parity Report</h1><p>Phase ${esc(report.phase)} · ${esc(report.startedAt)} · exit ${report.exitCode}</p>
<p>Rules ${report.summary.rules} · Mismatch ${report.summary.mismatches} · Missing ${report.summary.missing} · Errors ${report.summary.errors}</p>
<table><thead><tr><th>Source</th><th>Target</th><th>Status</th><th>Rows</th><th>Mismatch</th><th>Errors</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

export async function writeReport(dir: string, report: Report) {
  await mkdir(dir, { recursive: true });
  const jsonPath = join(dir, 'report.json'); const htmlPath = join(dir, 'report.html');
  await writeFile(jsonPath, JSON.stringify(report, null, 2)); await writeFile(htmlPath, renderHtml(report));
  return { jsonPath, htmlPath };
}
```

- [ ] **Step 4: Run to verify pass** — → PASS (3).

- [ ] **Step 5: Commit**

```bash
git add new-implementation/migration/src/core/reporter.ts new-implementation/migration/tests/reporter.spec.ts
git commit -m "feat(migration): JSON + static HTML parity reporter"
```

---

### Task 11: Import + verify commands

**Files:** Create `src/commands/{import,verify}.ts`. Behaviorally verified in Task 12.
**Interfaces:**
- Consumes: registry (Task 8), `applyFields` (Task 5), `newId` (Task 4), `compare` (Task 6), `pool`/lookups/tenant/schemas (Task 9).
- Produces: `runImport({dryRun?}): Promise<RuleResult[]>`; `runVerify(): Promise<RuleResult[]>`.

- [ ] **Step 1: Write `src/commands/import.ts`**

```ts
import { ruleOrder } from '../rules/_registry.js';
import { applyFields } from '../core/applyFields.js';
import { newId } from '../core/idMap.js';
import { pool, targetSchema, legacySchema } from '../core/targetDb.js';
import { loadLookups } from '../core/lookups.js';
import { resolveTenant } from '../core/legacyDb.js';
import type { MapRule, TransformCtx } from '../types/Rule.js';
import type { RuleResult, RowError } from '../types/Report.js';

const BATCH = 500;

export async function runImport(opts: { dryRun?: boolean } = {}): Promise<RuleResult[]> {
  const p = pool(); const legacy = legacySchema(); const target = targetSchema();
  const results: RuleResult[] = []; const failed = new Set<string>();
  try {
    const lookups = await loadLookups(p, legacy);
    const tenant = await resolveTenant(p, legacy);
    for (const rule of ruleOrder()) {
      if ((rule.dependsOn ?? []).some((d) => failed.has(d))) {
        results.push({ source: rule.source, target: rule.target, status: 'blocked_by_dependency', mismatches: [], errors: [] });
        continue;
      }
      const res = await importRule(p, legacy, target, rule, lookups, tenant, opts.dryRun ?? false);
      results.push(res); if (res.status === 'failed') failed.add(rule.source);
    }
    return results;
  } finally { await p.end(); }
}

async function importRule(p: any, legacy: string, target: string, rule: MapRule, lookups: any, tenant: any, dryRun: boolean): Promise<RuleResult> {
  const errors: RowError[] = []; const maxErrors = rule.maxRowErrors ?? 0; let imported = 0;
  const conn = await p.getConnection();
  try {
    if (!dryRun) await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT * FROM \`${legacy}\`.\`${rule.source}\``);
    for (let i = 0; i < rows.length; i += BATCH) {
      for (const row of rows.slice(i, i + BATCH)) {
        const ctx: TransformCtx = { row, source: rule.source, lookups, companyId: tenant.companyId, bootstrapUserId: tenant.bootstrapUserId };
        const id = newId(rule.idMap, rule.source, row[rule.idMap.legacyKey]);
        const { target: t, errors: rowErrors } = applyFields(rule, row, id, ctx);
        if (rowErrors.length) { errors.push(...rowErrors); continue; }
        if (dryRun) { imported++; continue; }
        const cols = Object.keys(t);
        const updates = cols.filter((c) => c !== 'id' && c !== 'legacy_id').map((c) => `\`${c}\`=VALUES(\`${c}\`)`).join(',');
        await conn.query(
          `INSERT INTO \`${target}\`.\`${rule.target}\` (${cols.map((c) => `\`${c}\``).join(',')})
           VALUES (${cols.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${updates}`,
          cols.map((c) => t[c] ?? null),
        );
        imported++;
      }
    }
    if (errors.length > maxErrors) { if (!dryRun) await conn.rollback(); return { source: rule.source, target: rule.target, status: 'failed', rowsImported: 0, mismatches: [], errors }; }
    if (!dryRun) await conn.commit();
    return { source: rule.source, target: rule.target, status: errors.length ? 'partial' : 'passed', rowsImported: imported, mismatches: [], errors };
  } catch (e) { if (!dryRun) await conn.rollback(); throw e; } finally { conn.release(); }
}
```

- [ ] **Step 2: Write `src/commands/verify.ts`** (scalable cross-schema fetch + in-memory transform/compare)

```ts
import { ruleOrder } from '../rules/_registry.js';
import { compare } from '../core/differ.js';
import { applyFields } from '../core/applyFields.js';
import { newId } from '../core/idMap.js';
import { pool, targetSchema, legacySchema } from '../core/targetDb.js';
import { loadLookups } from '../core/lookups.js';
import { resolveTenant } from '../core/legacyDb.js';
import type { TransformCtx } from '../types/Rule.js';
import type { RuleResult, RowResult } from '../types/Report.js';

const BATCH = 500;

export async function runVerify(): Promise<RuleResult[]> {
  const p = pool(); const legacy = legacySchema(); const target = targetSchema();
  const results: RuleResult[] = [];
  try {
    const lookups = await loadLookups(p, legacy);
    const tenant = await resolveTenant(p, legacy);
    for (const rule of ruleOrder()) {
      const [legacyRows] = await p.query<any[]>(`SELECT * FROM \`${legacy}\`.\`${rule.source}\``);
      const nonOk: RowResult[] = []; let verified = 0;
      for (let i = 0; i < legacyRows.length; i += BATCH) {
        const slice = legacyRows.slice(i, i + BATCH);
        const ids = slice.map((r) => newId(rule.idMap, rule.source, r[rule.idMap.legacyKey]));
        const [migrated] = await p.query<any[]>(
          `SELECT * FROM \`${target}\`.\`${rule.target}\` WHERE legacy_id IN (${slice.map(() => '?').join(',')})`,
          slice.map((r) => String(r[rule.idMap.legacyKey])),
        );
        const byLegacyId = new Map(migrated.map((m) => [String(m.legacy_id), m]));
        for (const row of slice) {
          const ctx: TransformCtx = { row, source: rule.source, lookups, companyId: tenant.companyId, bootstrapUserId: tenant.bootstrapUserId };
          const legacyPk = String(row[rule.idMap.legacyKey]);
          const { target: expected } = applyFields(rule, row, '', ctx);
          const res = compare(legacyPk, expected, byLegacyId.get(legacyPk) ?? null, rule.fields);
          verified++; if (res.status !== 'ok') nonOk.push(res);
        }
      }
      results.push({ source: rule.source, target: rule.target, status: nonOk.length ? 'failed' : 'passed', rowsVerified: verified, mismatches: nonOk, errors: [] });
    }
    return results;
  } finally { await p.end(); }
}
```

- [ ] **Step 3: Type-check** — `npx tsc -p tsconfig.json --noEmit` → no errors.

- [ ] **Step 4: Commit**

```bash
git add new-implementation/migration/src/commands/import.ts new-implementation/migration/src/commands/verify.ts
git commit -m "feat(migration): import (idempotent, dependency-aware) + scalable verify"
```

---

### Task 12: CLI wiring, safety rails, pre-flight, fixture + e2e

**Files:** Create `src/commands/{reset,report}.ts`, `src/core/preflight.ts`, `src/cli.ts`; Create `tests/fixtures/legacy-sample.sql`; Create `tests/e2e.spec.ts`.
**Interfaces:** working `migrate` binary; green e2e proving import→verify on a real-schema fixture.

- [ ] **Step 1: Write `src/core/preflight.ts`** (design §7.1 unknown-table halt)

```ts
import type { Pool } from 'mysql2/promise';
import { allLegacyTables } from '../rules/_registry.js';

export async function assertAllTablesClassified(p: Pool, legacy: string): Promise<void> {
  const [tables] = await p.query<any[]>(
    `SELECT TABLE_NAME n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`, [legacy]);
  const known = new Set(allLegacyTables);
  const unknown = tables.map((t) => t.n).filter((n) => !known.has(n));
  if (unknown.length) throw new Error(`unclassified legacy tables (need a map or skip rule): ${unknown.join(', ')}`);
}
```

- [ ] **Step 2: Write `src/commands/reset.ts`**

```ts
import { provisionTarget } from '../core/provision.js';
export async function runReset(): Promise<void> {
  await provisionTarget({
    host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3308),
    user: process.env.DB_USER ?? 'root', password: process.env.DB_PASSWORD ?? '',
    database: process.env.TARGET_DB_NAME ?? 'pos_db_migration',
  });
}
```

- [ ] **Step 3: Write `src/commands/report.ts`**

```ts
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderHtml } from '../core/reporter.js';
import type { Report } from '../types/Report.js';
export async function runReport(reportsDir = 'reports'): Promise<string> {
  const entries = (await readdir(reportsDir)).sort();
  if (!entries.length) throw new Error(`no reports in ${reportsDir}`);
  const latest = join(reportsDir, entries[entries.length - 1]);
  const report = JSON.parse(await readFile(join(latest, 'report.json'), 'utf8')) as Report;
  const htmlPath = join(latest, 'report.html'); await writeFile(htmlPath, renderHtml(report)); return htmlPath;
}
```

- [ ] **Step 4: Write `src/cli.ts`** (commander + rails + pre-flight)

```ts
import { Command } from 'commander';
import chalk from 'chalk';
import { runReset } from './commands/reset.js';
import { runImport } from './commands/import.js';
import { runVerify } from './commands/verify.js';
import { runReport } from './commands/report.js';
import { buildReport, writeReport } from './core/reporter.js';
import { assertAllTablesClassified } from './core/preflight.js';
import { pool, legacySchema } from './core/targetDb.js';

function requireMigrationEnv(): void {
  if (process.env.NODE_ENV !== 'migration') { console.error(chalk.red('refusing to run: NODE_ENV must be "migration"')); process.exit(2); }
}
async function preflight(): Promise<void> { const p = pool(); try { await assertAllTablesClassified(p, legacySchema()); } finally { await p.end(); } }
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const program = new Command();
program.name('migrate').description('M4 legacy parity-validation CLI');
program.command('reset').action(async () => { requireMigrationEnv(); await runReset(); console.log(chalk.green('target provisioned')); });
program.command('import').option('--dry-run').action(async (o) => {
  requireMigrationEnv(); await preflight();
  const report = buildReport('import', await runImport({ dryRun: !!o.dryRun }), new Date().toISOString());
  await writeReport(`reports/${stamp()}`, report);
  console.log(chalk.cyan(`import done — ${report.summary.errors} row errors`)); process.exit(report.exitCode);
});
program.command('verify').action(async () => {
  await preflight();
  const report = buildReport('verify', await runVerify(), new Date().toISOString());
  await writeReport(`reports/${stamp()}`, report);
  console.log(report.exitCode === 0 ? chalk.green('parity OK') : chalk.red('parity FAILED')); process.exit(report.exitCode);
});
program.command('report').action(async () => { console.log(await runReport()); });
program.parseAsync().catch((e) => { console.error(chalk.red(e.message)); process.exit(2); });
```

- [ ] **Step 5: Write `tests/fixtures/legacy-sample.sql`** — synthetic-but-real-schema. Recreate the 7 mapped legacy tables + the lookups (`formaspago`, `inventarios_precios`, `inventarios_listas`) + at least one fiscal + one reference + one new-app table (so the pre-flight sees a realistic set) with **DDL matching `info/bd_ex.sql`'s real columns** and ~3–5 fake rows each, referentially consistent (a company, 2 users, 2 customers, 3 products with prices, 2 orders with lines + payments). Derive the DDL from `/tmp/.../scratchpad/legacy_ddl.sql`. No real PII. Include `IdEmpresa`/`IdCliente`/etc. so deterministic UUIDs join.

- [ ] **Step 6: Write `tests/e2e.spec.ts`** (one container, two schemas)

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import mysql from 'mysql2/promise';
import { provisionTarget } from '../src/core/provision.js';
import { runImport } from '../src/commands/import.js';
import { runVerify } from '../src/commands/verify.js';
import { buildReport } from '../src/core/reporter.js';

const here = dirname(fileURLToPath(import.meta.url));
let container: StartedMySqlContainer;

beforeAll(async () => {
  process.env.NODE_ENV = 'migration';
  container = await new MySqlContainer('mysql:8.0').withRootPassword('root').start();
  const host = container.getHost(), port = container.getPort();
  process.env.DB_HOST = host; process.env.DB_PORT = String(port);
  process.env.DB_USER = 'root'; process.env.DB_PASSWORD = 'root';
  process.env.LEGACY_DB_NAME = 'pos_legacy'; process.env.TARGET_DB_NAME = 'pos_db_migration';

  const c = await mysql.createConnection({ host, port, user: 'root', password: 'root', multipleStatements: true });
  await c.query('CREATE DATABASE pos_legacy CHARACTER SET utf8mb4');
  await c.query('USE pos_legacy');
  await c.query(readFileSync(join(here, 'fixtures/legacy-sample.sql'), 'utf8'));
  await c.end();

  await provisionTarget({ host, port, user: 'root', password: 'root', database: 'pos_db_migration' });
}, 180_000);

afterAll(async () => { await container?.stop(); });

describe('M4 e2e parity (real schema, synthetic data)', () => {
  it('imports then verifies with zero mismatches', async () => {
    const imp = buildReport('import', await runImport(), '2026-06-29T00:00:00.000Z');
    expect(imp.summary.errors).toBe(0);
    const ver = buildReport('verify', await runVerify(), '2026-06-29T00:00:00.000Z');
    expect(ver.exitCode).toBe(0);
    expect(ver.summary.mismatches).toBe(0);
    expect(ver.summary.missing).toBe(0);
  });
  it('is idempotent — second import keeps verify green', async () => {
    await runImport();
    expect(buildReport('verify', await runVerify(), '2026-06-29T00:00:00.000Z').exitCode).toBe(0);
  });
});
```

- [ ] **Step 7: Run full suite** — `cd new-implementation/migration && cd ../backend && npm install && cd ../migration && npm run test`
Expected: all unit + e2e PASS (Docker required). If `provisionTarget` can't resolve the backend import, fix the relative path; do NOT mock it. Iterate the fixture until import has 0 errors and verify is green — mismatches here mean a rule transform is wrong, which is the point of the exercise.

- [ ] **Step 8: Commit**

```bash
git add new-implementation/migration/src/cli.ts new-implementation/migration/src/commands/reset.ts new-implementation/migration/src/commands/report.ts new-implementation/migration/src/core/preflight.ts new-implementation/migration/tests/fixtures new-implementation/migration/tests/e2e.spec.ts
git commit -m "feat(migration): CLI, safety rails, unknown-table preflight, real-schema e2e"
```

---

### Task 13: Real-dump runbook, README, status flips

**Files:** Create `new-implementation/migration/README.md`; Modify `docs/specs/SPEC-MIGR-001-legacy-migration.md`, `docs/specs/SPEC-001-pos-modernization.md`, `new-implementation/CLAUDE.md`.

- [ ] **Step 1: Write `README.md`** — prerequisites (Docker, `backend` deps installed), the four commands, env vars, safety rails, fiscal-deferred-to-M5 note, and the **real-dump runbook**:

```bash
# Load the real legacy dump into a pos_legacy schema on the dev MySQL (port 3308):
mysql -h127.0.0.1 -P3308 -upos_user -p -e "CREATE DATABASE IF NOT EXISTS pos_legacy CHARACTER SET utf8mb4"
mysql -h127.0.0.1 -P3308 -upos_user -p pos_legacy < ../../info/bd_ex.sql
# Provision target + run parity:
NODE_ENV=migration npm run migrate -- reset
NODE_ENV=migration npm run migrate -- import
NODE_ENV=migration npm run migrate -- verify
NODE_ENV=migration npm run migrate -- report
```

- [ ] **Step 2: Flip `SPEC-MIGR-001`** — `**Status**: APPROVED` → `**Status**: IN_PROGRESS` (colon OUTSIDE the bold).

- [ ] **Step 3: Flip M4 in master spec** — `status: planned` → `status: in_progress` in the M4 block. Do NOT touch `issues: []`.

- [ ] **Step 4: Add `migration/` to `new-implementation/CLAUDE.md`** layout + a dev-command line.

- [ ] **Step 5: Commit**

```bash
git add new-implementation/migration/README.md docs/specs/SPEC-MIGR-001-legacy-migration.md docs/specs/SPEC-001-pos-modernization.md new-implementation/CLAUDE.md
git commit -m "docs(migration): README + real-dump runbook + flip M4/MIGR-001 to in_progress"
```

---

## Self-Review

**Spec coverage (design §2–§8 + Amendment §11 + real-dump decisions):**
- Standalone package, off backend graph → Task 1; provisioning via TypeORM migrations (Amendment A1) → Task 9; `legacy_id` migration (A2) → Task 3; fiscal deferral (A3-updated) → Task 8 `_skips.ts`.
- Rule contract → Task 2; real Spanish→English rules + lookups (price/total/payment) → Tasks 5, 8, 9.
- Ordering/idempotency/safety rails/unknown-table halt → Tasks 7, 8 (registry), 9 (`assertMigrationDb`), 11, 12 (`preflight`, `requireMigrationEnv`).
- Error buckets (§7) → Task 11 (`failed`/`partial`/`blocked_by_dependency`) + Task 12 (preflight exit 2).
- Output JSON+HTML + exit codes → Task 10 + Task 12.
- Testing: rule/core unit (Tasks 4–10), real-schema e2e + idempotency (Task 12). Charset utf8mb3→mb4 handled at connection (Task 9 `pool` charset).

**Deferred-to-execution (real decisions, not placeholders):**
- Exact target columns for `users` (and confirm `customers` has `company_id`/`deleted_at`) — Task 8 Step 2 note says read the entities and adjust `to:` names. Required before the e2e goes green.
- `formaspago` id→method and `documentos` doc-type semantics — Task 8 Step 2 investigative note; `mapPaymentMethod` heuristic tolerates gaps.
- Whether `orders.status`/`payment_status` need a value beyond completed/cancelled — confirm against real `encabezados` once loaded.

**Type consistency:** `TransformCtx` (with `lookups`/`companyId`/`bootstrapUserId`) consistent across Tasks 2, 5, 8, 11. `RuleResult`/`RowResult`/`Report` across 2, 10, 11. `pool`/`targetSchema`/`legacySchema`/`assertMigrationDb` across 9, 11, 12. `ruleOrder` returns `MapRule[]` — used as such in 11.

**Known risk:** the committed e2e proves the machine on synthetic data; it does NOT prove the rules against the real `bd_ex.sql` (PII can't go in git). Real parity is the Task 13 runbook, run locally — flagged so "e2e green" is not mistaken for "real data migrates cleanly."

---

## Execution notes
- **Prereq:** `cd new-implementation/backend && npm install`; Docker running for Testcontainers.
- Tasks 4–10 are pure-unit (no DB). Tasks 11–12 need Docker.
- Run the real-dump runbook (Task 13) locally after Task 12 to validate the actual rules; expect to iterate rule transforms until `verify` is green against `bd_ex.sql`.
