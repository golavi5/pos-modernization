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

## 🆕 Added after this run — not exercised here (PR #25)
This record predates two §5 checklist items added with the company-scoping fix.
Neither was run in this rehearsal; both must be exercised on the staging re-run:
- **Company read/write scoping** — a tenant `admin` sees only its own row on
  `GET /companies`, gets **404** on another company's `GET`/`PATCH`, and the other
  company's row is unchanged; `superadmin` still sees both.
- **Cross-tenant purge** — `DELETE /notifications/admin/clean-old` as one
  company's `admin` leaves the other company's old read notifications intact.

## ⏳ Coolify-only — still pending real staging
- Subdomain CORS against real `app.`/`api.`; MySQL port-not-exposed;
  rollback-by-redeploy rehearsal; Coolify healthcheck + observability (S-02).

---

## Go / No-Go
**NO-GO for production cutover.** Resolve **B-10** (role provisioning), then
re-run the full sequence on a real Coolify **staging** instance to close the
remaining exit criteria before `SPEC-CUT-001` can flip to DONE.

---

## Local backup/restore rehearsal

**Date:** 2026-07-09 · **Operator:** Claude Code · **Scope:** exercise
`scripts/db-backup.sh` + `scripts/db-restore.sh` end-to-end against a MySQL
8.0 stack (SPEC-CUT-002 non-infra prep). ✅ **PASS — restore verified,
row counts and per-table checksums match; no script bugs found.**

> **Substitution note.** Run against a standalone `mysql:8.0` container
> (`rehearsal-db`) with a **representative seeded dataset**, not a full
> app-boot. This isolates the backup/restore *mechanics* (mysqldump → gzip →
> gunzip → mysql, cross-DB) without building the backend image or minting
> secrets. The scripts are schema-agnostic, so a representative multi-table
> set proves the same code paths as the prior full-stack S-03 check
> (users/companies/roles = 1/1/1). No host `mysql`/`mysqldump` client exists,
> so both scripts ran inside a `mysql:8.0` client container joined to the DB's
> docker network.

### Commands run

```bash
# 1. Standalone MySQL + seed a representative dataset (as root)
docker network create posrehearsal
docker run -d --name rehearsal-db --network posrehearsal \
  -e MYSQL_ROOT_PASSWORD=rootpw -e MYSQL_DATABASE=pos_db \
  -e MYSQL_USER=pos_user -e MYSQL_PASSWORD=secretpw mysql:8.0
# seed companies/roles/users/customers/products with known counts (2/3/2/4/3),
# create empty pos_scratch, GRANT pos_user on pos_db.* and pos_scratch.*

# 2. Backup — the real script, in a client container on the DB network
docker run --rm --network posrehearsal \
  -v "$PWD/scripts:/scripts:ro" -v "$BACKUP_DIR:/backups" \
  -e DB_HOST=rehearsal-db -e DB_PORT=3306 -e DB_USERNAME=pos_user \
  -e DB_PASSWORD=secretpw -e DB_NAME=pos_db -e BACKUP_DIR=/backups \
  -w /scripts mysql:8.0 bash db-backup.sh
# → Backup written: /backups/pos_db_20260709-034531.sql.gz (4.0K)

# 3. Restore into the pre-created scratch DB — the real script
docker run --rm --network posrehearsal \
  -v "$PWD/scripts:/scripts:ro" -v "$BACKUP_DIR:/backups" \
  -e DB_HOST=rehearsal-db -e DB_PORT=3306 -e DB_USERNAME=pos_user \
  -e DB_PASSWORD=secretpw -e DB_NAME=pos_scratch -e CONFIRM=yes \
  -w /scripts mysql:8.0 bash db-restore.sh /backups/pos_db_20260709-034531.sql.gz
# → Restored 'pos_scratch' from /backups/pos_db_20260709-034531.sql.gz
```

### Result — source (`pos_db`) vs restored (`pos_scratch`)

| Table | Source rows | Restored rows | `CHECKSUM TABLE` match |
|---|---|---|---|
| companies | 2 | 2 | ✅ (2594916727) |
| roles | 3 | 3 | ✅ (4231426328) |
| users | 2 | 2 | ✅ (1088811489) |
| customers | 4 | 4 | ✅ (2443462279) |
| products | 3 | 3 | ✅ (3741109840) |

Row counts **and** per-table checksums are identical across all five tables —
the restore is byte-faithful, not merely row-count-equal.

### Findings / script health

- **Happy path clean** — `db-backup.sh` and `db-restore.sh` ran unmodified.
  `--single-transaction --no-tablespaces --routines --triggers --events`
  dumped cleanly under a scoped `pos_user` (no `PROCESS`/global-privilege
  errors), confirming the MySQL-8 flag choices are correct.
- **B-11 — partial archive on a failed dump (found after this run, FIXED in
  PR #25).** This rehearsal exercised only the success path. `db-backup.sh`
  wrote `mysqldump | gzip > "$out"` directly, and the shell truncates the
  redirect target before `mysqldump` can fail — so a dump killed mid-run (DB
  restart, dropped connection, disk pressure) left a partial
  `${DB_NAME}_*.sql.gz` that is indistinguishable by name from a good backup.
  Retention (`-mtime +RETENTION_DAYS`) would then prune the last known-good
  archives in its favour and a later `db-restore.sh` would restore an
  incomplete dataset — silent data loss during the rollback this rehearsal
  exists to certify. The script now dumps to `$out.partial`, verifies it with
  `gzip -t`, and only then renames it into place, with an `EXIT` trap removing
  the scratch file on any failure. Covered by `src/scripts/db-backup.spec.ts`
  (stub `mysqldump` that dies mid-stream → no file left behind).
- **Observed contract (not a bug):** `db-restore.sh` does **not**
  `CREATE DATABASE` — the dump is single-schema (no `--databases`), so the
  target must already exist. This matches the script header ("Restore into a
  SCRATCH database first") and the destructive-overwrite guard; the operator
  creates the scratch DB before restoring. Left as-is intentionally.

## Case-B restore mechanics rehearsal (runbook §3 B1)

**Date:** 2026-08-08 · **Operator:** Claude Code · **Scope:** validate the DB
steps of `STAGING-ROLLBACK-RUNBOOK.md` §3 B1 against a `mysql:8.0` stack, using
the same client-container method as the backup/restore rehearsal above.
✅ **PASS — the corrected sequence produces a clean pre-migration schema.**

Seeded `pos_db` (`companies`, `typeorm_migrations` with two rows) → backup →
simulated a bad deploy (`CREATE TABLE payments_v2` + a third ledger row).

| # | Check | Result |
|---|---|---|
| A | Plain restore over `pos_db` (no `DROP DATABASE`) | ❌ ledger rolled back to 2 rows **but `payments_v2` survives** — the half-rollback that crash-loops the next forward deploy |
| B | `DROP DATABASE` + `CREATE … CHARACTER SET/COLLATE` + restore | ✅ `payments_v2` gone, `companies` data intact, ledger at 2 rows |
| — | `SHOW GRANTS` after `DROP DATABASE` | ✅ `pos_user`'s `pos_db.*` grant survives — no re-GRANT needed |
| C | Restore into a fresh `pos_scratch` **without** a GRANT | ❌ `ERROR 1044 (42000): Access denied for user 'pos_user'@'%' to database 'pos_scratch'` |
| D | Same, **with** `GRANT ALL ON pos_scratch.*` | ✅ restored |
| E | Client container **without** `-it` and without `CONFIRM=yes` | ❌ prompt read hits EOF, `set -e` aborts before any SQL runs — hence `-it` in the runbook |

Also confirmed: the dump contains **no** `CREATE DATABASE` (single-schema), and
the live `pos_db` default collation is `utf8mb4_0900_ai_ci` (MySQL 8 server
default via `MYSQL_DATABASE`), **not** the `utf8mb4_unicode_ci` that
`database/schema.sql` declares per table — so the recreate must copy the
recorded value rather than assume one.

### Still pending (Coolify-only, out of scope tonight)
- Rollback-by-redeploy rehearsal (§6 of `STAGING-DRY-RUN.md`) — needs a live
  Coolify instance and forward-only migration history. The DB mechanics of the
  Case-B path are pre-validated above; what remains is the Coolify stop /
  redeploy / health-gate loop.

---

## Case-B revert rehearsal (runbook §3 B2) — guarded script

**Date:** 2026-08-08 · **Operator:** Claude Code · **Scope:** exercise
`npm run migration:revert-one:prod` (`dist/database/revert-one-migration.js`)
against a throwaway `mysql:8.0`, using the **compiled** artefacts the production
image ships. ✅ **PASS — every guard fires, and a confirmed revert undoes exactly
one migration.**

Applied the real history with `npm run migration:run:prod` (which also validates
the new `typeorm:prod` indirection), then drove the script through each path.

| # | Check | Result |
|---|-------|--------|
| A | `migration:run:prod` via `npm run typeorm:prod -- migration:run` | ✅ both migrations applied, ledger has 2 rows |
| B | No TTY on stdin | ✅ exit 1, "Refusing to run without a TTY" — no connection opened |
| C | `DB_RUN_MIGRATIONS=true` (with TTY) | ✅ exit 1, tells the operator to set it `false` first |
| D | Wrong text at the prompt (`yes`) | ✅ exit 1, "Nothing was reverted" — ledger still 2 rows |
| E | Exact head name typed | ✅ exit 1→0, **only** `AddLegacyIdColumns` reverted; `legacy_id` gone from `products`; ledger 1 row; 15 tables intact |
| F | Re-run with one migration left | ✅ prints the `⚠⚠ only applied migration … drops every table` warning, and lists the reverted one as *pending* |
| G | Confirmed `InitialSchema` revert (throwaway DB) | ✅ all 15 tables dropped, ledger empty — the destructive path the guards exist to gate |
| H | `migration:show:prod` | ✅ lists both migrations with applied/pending markers (no mysql client needed) |
| I | Same run **inside the real production image** — `docker build` of `backend/Dockerfile`, `node:20-alpine`, `USER nestjs`, `npm ci --omit=dev` | ✅ `dist/database/revert-one-migration.js` ships; `npm run` resolves as non-root; no-TTY refusal, `migration:run:prod`, and a confirmed `-it` revert all behave as on the host |

Guards B and C are covered in the unit suite
(`src/database/revert-one-migration.spec.ts`, 3 cases incl. no-`CONFIRM`-bypass);
they fire before any `DataSource` is constructed, so they need no database. The
interactive paths (D–G) require a pty and are the hand-rehearsal recorded here.

> Not rehearsed: a `down()` that throws **mid-way**. MySQL auto-commits DDL, so
> that leaves the schema half-reverted with the ledger row intact — unrecoverable
> by script (§5 routes it to B1, exit code `2`).

---

# Dry-run §4/§5 sobre Coolify — 2026-08-11 · veredicto 🔴 **NO-GO**

**Instancia:** `facturame_app_modern` en el VPS `10.0.50.20` (Coolify, stack
compose completo), expuesta por Cloudflare Tunnel en
`facturame.automatizate.dev` / `facturame-api.automatizate.dev`.
Commit desplegado: `a826c31c`.

> ⚠️ **Esto NO es el staging que pide `SPEC-CUT-002` §1** ("a real Coolify
> **staging** instance"). Es el propio destino de go-live, corrido mientras la
> base estaba vacía (1 empresa + 1 admin de bootstrap, cero productos, ventas,
> clientes y notificaciones). Se eligió así deliberadamente: prueba el binario
> que de verdad se va a usar. Pero el §4 de CUT-002 ("Only after GO: production
> cutover scheduled separately") presupone dos entornos, y aquí hay uno.

**Método por item** — el criterio de CUT-002 pide "real browser, not curl":
navegador real (Playwright, Chromium) para §4 y para los redirects/nav de §5;
`curl` para las aserciones de código HTTP de §5, que son de API por
construcción. Se indica en cada fila.

**Condiciones sembradas** (la API no permite crearlas):
1. Usuario `admin2@dryrun.local` en la empresa 2 — `usersService.create()` usa
   siempre `currentUser.company_id`, así que **no existe camino de API para crear
   un usuario en otra empresa**. Insertado en MySQL reusando el `password_hash`
   de `admin1` (misma contraseña).
2. 7 notificaciones con `createdAt` retrasado (45 y 60 días) en ambas empresas,
   más controles recientes y no-leídas. El sistema se creó hoy: sin sembrar, la
   purga de >30 días no se puede ejercitar.

## §4 Smoke — core flow · 🔴 **FALLA (bloqueante)**

| # | Item | Método | Resultado |
|---|------|--------|-----------|
| 1 | Login → `/dashboard` | navegador | ✅ `admin1@dryrun.local` aterriza en `/dashboard` |
| 2 | Crear categoría + producto | navegador | ❌ el formulario devuelve **400**. Creado después por API con payload a mano |
| 3 | Completar una venta en ≤4 clics | navegador | ❌ **BLOQUEANTE** — la caja carga pero **sin rejilla de productos**; carrito vacío y `💳 Charge` deshabilitado |
| 4 | Adjuntar cliente real + búsqueda por nombre | — | ⛔ **NO EJECUTADO** — inalcanzable, depende de (3) |
| 5 | Reportes reflejan la venta | — | ⛔ **NO EJECUTADO** — inalcanzable, depende de (3) |

**Pass gate ("all of the above succeed with no 5xx"): NO CUMPLIDO.** No hubo
ningún 5xx — los fallos son 400 y 404, que el gate literalmente no menciona.
El gate necesita reescribirse: un 400 en el catálogo impide vender igual que un 500.

## §5 Smoke — security · ✅ **PASA todo lo ejecutable**

| Item | Método | Resultado |
|------|--------|-----------|
| RBAC: nav del cajero | navegador | ✅ solo `/sales`, `/dashboard`, `/products`, `/customers`; **Users y Settings ocultos** |
| RBAC: `/users` y `/settings` redirigen | navegador | ✅ ambos → `/dashboard` |
| RBAC: `/sales` alcanzable por cajero | navegador | ✅ carga |
| RBAC: backend 403 | curl | ✅ `/users`, `/users/roles/list`, `/companies`, `/settings`, `DELETE /notifications/admin/clean-old` → **403** |
| Escalada: `POST /companies` como admin | curl | ✅ **403** |
| Escalada: `GET /users/roles/list` oculta `superadmin` | curl | ✅ devuelve 5 roles, sin `superadmin` |
| Escalada: `PATCH /users/:id/roles` con `superadmin` | curl | ✅ **403** `You cannot assign an elevated role.` |
| Scoping: `GET /companies` como admin E1 | curl | ✅ exactamente 1 fila (`Automatizate`); ni nombre ni `tax_id` de E2 |
| Scoping: `GET /companies/<E2>` | curl | ✅ **404** (no 403) |
| Scoping: `PATCH /companies/<E2>` | curl | ✅ **404** y la fila de E2 **sin cambios** (`DryRun Empresa Dos \| 900888777-1`) |
| Scoping: `GET`/`PATCH` propia | curl | ✅ **200** / **200** |
| Scoping: `GET /companies` como superadmin | curl | ✅ **ambas** empresas |
| Purga cross-tenant | curl + SQL | ✅ `{"deleted":2}` — borró solo las 2 viejas-leídas de E1; sobreviven su no-leída y su reciente, y **las 3 de E2 intactas** |
| **Extra:** crear producto declarando `company_id` ajeno | curl | ✅ **401** `Cannot create product for another company` |
| Aislamiento en reports/customers | — | ⛔ **NO EJECUTADO** — requiere crear datos por UI, bloqueado por §4 |

**Pass gate: cumplido en los caminos ejecutados**, con la laguna explícita de
reports/customers.

## Defectos encontrados

**D1 · `GET /products` devuelve 400 SIEMPRE — bloqueante.**
`dto/product-query.dto.ts`:
```ts
@IsOptional()
@Transform(({ value }) => value === 'true')
@IsString()
is_active?: boolean = true;
```
`@Transform` lo convierte a booleano y `@IsString()` lo rechaza. El valor por
defecto (`= true`) hace que `@IsOptional()` no salve el caso: incluso
`GET /products` sin parámetros falla con `["is_active must be a string"]`.
**Consecuencia: el catálogo nunca carga, así que el POS no puede vender.**

**D2 · Todo `lib/api/sales.ts` apunta a rutas que no existen — bloqueante.**

| Frontend | Backend real | |
|---|---|---|
| `POST /sales` | `POST /sales/orders` | 404 |
| `GET /sales?…` | `GET /sales/orders` | 404 |
| `GET /sales/:id` | `GET /sales/orders/:id` | 404 |
| `PATCH /sales/:id` | `PATCH /sales/orders/:id/status` | 404 |
| `PATCH /sales/:id/cancel` | `DELETE /sales/orders/:id` | 404 |
| `GET /sales/stats` | `GET /sales/reports/summary` | 404 |
| `GET /sales/today` | `GET /sales/reports/daily` | 404 |

Los widgets de ventas del dashboard y "Recent sales" salen vacíos por esto, no
por falta de datos.

**D3 · `POST /products` exige campos que el cliente no debería mandar.**
`company_id` y `created_by` son obligatorios en el DTO; el resto del código los
toma del JWT (`usersService.create(currentUser.company_id, …)`). **No es un
agujero de seguridad** — el servicio rechaza un `company_id` ajeno con 401 —
pero rompe el formulario de la UI. Además el regex de SKU `/^[A-Z0-9]+$/`
rechaza guiones, mientras el placeholder del propio campo es `PRD-001`.

**D4 · Cosméticos.** `favicon.ico` → 404. El pie del modal de producto queda
fuera del viewport en pantallas de ~720 px de alto y nada scrollea. La UI sale
en inglés aunque `SPEC-FRONT-002` fija `es` como locale por defecto.

## Veredicto

**Recomendación: 🔴 NO-GO.** La infraestructura está sana — TLS, CORS, túnel,
migraciones, bootstrap, RBAC y aislamiento multi-tenant pasan todos. Pero
**el sistema no puede registrar una venta**, que es su función. D1 y D2 son
correcciones de pocas líneas y no hay nada de arquitectura que rehacer;
requieren un despliegue nuevo y volver a correr §4.

`SPEC-CUT-002` §4 pide "Go/No-Go recorded (date + operator)". El operador es
Gandhi Olavi, no quien ejecutó estas pruebas:

| | |
|---|---|
| Ejecutado por | Claude Opus 5 (sesión asistida), 2026-08-11 |
| Recomendación | **NO-GO** — D1 y D2 bloquean el flujo de venta |
| **Operador (firma)** | _pendiente_ |
| **Fecha de firma** | _pendiente_ |

## Datos de prueba creados

Empresa `DryRun Empresa Dos` (`087d4938-…`); usuarios `admin1@dryrun.local`,
`cajero1@dryrun.local`, `admin2@dryrun.local`; producto `DRY001`; 5
notificaciones sembradas supervivientes; teléfono de la empresa 1 cambiado a
`3001234567` por la prueba de `PATCH` propio. Acordado con el operador: se
borra el volumen de MySQL y se redespliega, de modo que producción arranque
prístina — posible sin pérdida porque no había ningún dato real.

---

## Addendum 2026-08-11 (2ª pasada, commit `97695db4`) — el veredicto NO-GO se mantiene y se agrava

D1 y D2 quedaron cerrados y verificados en el despliegue: `GET /products`
devuelve 200 en las tres variantes, la rejilla de productos carga, y el `POST`
llega a `/sales/orders` sin 404. Aparecieron entonces defectos que los dos
primeros **tapaban**.

**D5 · `CreateOrderDto` rechazaba toda venta normal** — corregido en `97695db4`.
`discount_amount` estaba con `@IsPositive()`, y cero no es positivo: una venta
sin descuento se rechazaba siempre. Y `unit_price` no tenía coerción, mientras
MySQL entrega DECIMAL como string (`"25000.00"`). Regresión en
`d5-regression.spec.ts` con el payload real capturado del navegador, verificada
por mutación (3/4 rojos contra el DTO original, con los mensajes exactos).

**Con eso, §4-3 se ejecuta: la venta se completa en 4 clics** (producto →
Charge → Card → Confirm) y el carrito se vacía. Pero lo que queda registrado no
es lo que la caja mostró:

| | La UI mostró | El sistema registró |
|---|---|---|
| Total | **$ 25.000** (y el botón cobra `Charge $ 25.000`) | `total_amount = 29750.00` |
| Estado | venta completada, carrito vaciado | `status = draft` |
| Pago | tarjeta, confirmada | `payment_status = unpaid`, **0 filas en `payments`** |
| Stock | — | **50 → 50: no se descontó** |

**D7 · El total de la caja está mal.** `Subtotal 25.000 + IVA 4.750` son 29.750,
pero la línea `Total` y el botón de cobro dicen 25.000. El backend calcula bien
(`subtotal + tax_amount`). **Se cobra al cliente $4.750 menos de lo que se
registra, en cada venta.** Es un defecto de dinero, el más caro de todos los
encontrados.

**D6 · El método de pago se descarta en silencio.** El carrito manda
`payment_method` y `payment_status`, pero `CreateOrderDto` no los declara y el
`ValidationPipe` global (`whitelist: true`) los elimina antes de llegar al
servicio. Existe `POST /sales/orders/:id/payments`, que el frontend nunca llama.
Resultado: toda venta nace `draft`/`unpaid` y la tabla `payments` queda vacía.

**D8 · La venta no descuenta inventario.** El stock siguió en 50 tras dos
pedidos de 1 unidad. `createOrder` valida stock suficiente pero no lo ajusta, y
`stock_movements` sigue vacía.

### Estado del checklist tras la 2ª pasada

| Item | Antes | Ahora |
|---|---|---|
| §4-1 login | ✅ | ✅ |
| §4-2 catálogo + producto | ❌ | ✅ (rejilla carga; el alta por formulario sigue con D3) |
| §4-3 venta en ≤4 clics | ❌ bloqueado | ⚠️ **la UI la completa, pero el registro es incorrecto** (D6, D7, D8) |
| §4-4 cliente real | ⛔ | ⛔ no ejecutado — sin sentido hasta cerrar D6–D8 |
| §4-5 reportes | ⛔ | ⛔ no ejecutado — informarían totales de pedidos `draft`/`unpaid` |

**§5 no se re-ejecutó**: ninguno de D5–D8 toca RBAC, escalada de privilegios,
scoping de empresas ni la purga cross-tenant, y los cambios de `97695db4` son de
validación de DTO. Los resultados de la 1ª pasada siguen vigentes.

### Veredicto tras la 2ª pasada: 🔴 **NO-GO** (sin cambios)

Es peor que el primero, no mejor: entonces el POS no vendía y se notaba. Ahora
vende, parece funcionar, y deja mal el dinero, el estado del pedido y el
inventario. Un despliegue con D7 vivo pierde $4.750 por cada venta de $29.750
sin que nadie lo vea hasta cuadrar caja.

D6, D7 y D8 no son correcciones de una línea como D1/D2/D5: hay que decidir el
flujo de pago (¿el `create` acepta el pago, o el frontend llama al endpoint de
pagos?), quién calcula el total mostrado, y dónde se descuenta el stock. Eso es
diseño, y le corresponde al operador antes de tocar código.

---

## Addendum 2026-08-11 (3ª pasada, commit `b11a971b`) — D6, D7 y D8 cerrados

Implementado según `POS-BACK-003` (5 tareas, cada una con revisión independiente
y verificación por mutación). Verificado contra el despliegue real, no solo en
tests.

**Cableado del transformer** — lo único que un unitario no podía demostrar:
`GET /products` devuelve `price`, `cost` y `tax_rate` como **números**, no como
strings.

**§4-3, venta completa en navegador real** (producto → Charge → Card → Confirm):

| | 2ª pasada | 3ª pasada |
|---|---|---|
| Total en la caja | `$ 25.000` | **`$ 29.750`** |
| `total_amount` registrado | `29750.00` | `29750.00` — **coinciden** |
| `status` | `draft` | **`completed`** |
| `payment_status` | `unpaid` | **`paid`** |
| filas en `payments` | 0 | **1** (`card`, `29750.00`, `completed`) |
| stock `DRY001` | 50 → 50 | **50 → 49** |
| `stock_movements` | vacía | **`OUT` cant=1**, con `reference_id` al pedido |
| bodegas | 0 | **1**, creada bajo demanda |

Pedido de referencia: `ORD2026081100003`.

### Lo que las revisiones encontraron y los tests no habrían encontrado

**Doble descuento por la puerta de `confirmed`.** El plan especificaba la guarda
como "no estaba `completed` antes". Pero `sales.service.ts` **ya descontaba
stock** al pasar un pedido a `CONFIRMED`, y `CONFIRMED → COMPLETED` es
transición válida: la secuencia *confirmar → cobrar* descontaba dos veces. El
invariante correcto no es un estado sino "este pedido no ha descontado
todavía". Anclado en el estado de la fila **bloqueada**, que cubre las dos vías
productoras — anclarlo en la ausencia de un movimiento previo, como se propuso
primero, **no habría detectado el bug**: `deductStock` descuenta sin dejar
rastro.

**El importe se calculaba en el cliente.** La caja enviaba su propio total (IVA
sobre el subtotal agregado) mientras el backend lo suma por ítem. Al divergir por
redondeo, el pedido quedaba `partially_paid`: sin cerrar, sin descontar stock, y
**con la caja mostrando éxito**. Ahora se envía `order.total_amount`, la única
fuente de verdad.

### Abierto

- **La pantalla de confirmación nunca se pinta.** `handleConfirmPayment` cierra
  el modal en el mismo tick en que éste intenta renderizar su estado de éxito.
  La venta **sí** se cierra (verificado por tráfico de red y por la base), pero
  el cajero no ve confirmación, y 3 specs e2e preexistentes quedan en rojo.
  **Preexistente**, no introducido por este trabajo.
- El bloqueo pesimista no está ejercitado contra MySQL bajo concurrencia real.
- `refundPayment` no puede devolver stock de una venta descontada por la vía
  `confirmed`, porque esa vía no deja rastro. Asimetría heredada.
- §4-4 (cliente real con búsqueda por nombre) y §4-5 (reportes) siguen **sin
  ejecutar**.

**El veredicto de `SPEC-CUT-002` sigue siendo del operador.** Estos tres
defectos ya no lo bloquean, pero §4 no está completo y §6 (backup/rollback) no
se ha ensayado.

---

# Dry-run completo §4–§7 — 2026-08-11 · commit `87b77828`

Ejecutado sobre la instancia Coolify (`facturame_app_modern`, VPS 10.0.50.20,
Cloudflare Tunnel), con la base **recién inicializada desde cero** tras borrar el
volumen: 16 tablas por migraciones, empresa y admin por bootstrap, cero datos
heredados. Navegador real (Playwright/Chromium) para §4; `curl` y SQL para las
aserciones de API y de estado persistido; contenedor cliente `mysql:8.0` unido a
la red del stack para §6, como exige el runbook.

## §4 Smoke — core flow

| # | Item | Método | Resultado |
|---|------|--------|-----------|
| 1 | Login → `/dashboard` | navegador | ✅ |
| 2 | Categoría + producto | navegador | ❌ **D3 sigue abierto**: el formulario devuelve 400 (`company_id`/`created_by` obligatorios en el DTO, regex de SKU que rechaza guiones). El producto se creó por API para poder continuar |
| 3 | Venta en ≤4 clics | navegador | ✅ producto → Charge → Card → Confirm |
| 4 | Cliente real + búsqueda por nombre | navegador | ✅ cliente creado desde su formulario (ése sí funciona); búsqueda correcta en las tres variantes — parcial (`Fernanda`), minúsculas contra mayúscula (`restrepo`) y con tilde (`María`), lo que confirma el fix `ILIKE`→`LIKE`; la venta persiste el `customer_id` real |
| 5 | Reportes reflejan la venta | navegador | ✅ Total Sales 1 · Revenue `$10.115` · Profit `$2.500` (8.500−6.000) · **Revenue by Payment Method: Card, 1 transactions, 100%** |

**Estado persistido de la venta** (`ORD2026081100001`): total `10115.00`
coincidiendo con lo que mostró la caja, `completed`/`paid`, una fila en
`payments` (`card`, 10115.00), cliente `María Fernanda Restrepo`, stock 30 → 29,
un `stock_movements` `OUT` con `reference_id` al pedido.

**Pass gate: cumplido salvo el item 2.** Sin 5xx.

## §5 Smoke — security

**No se re-ejecutó en esta pasada.** Se verificó entero el 2026-08-11 contra el
commit `a826c31c` (ver acta de la 1ª pasada): RBAC de cajero, los tres límites de
escalada de privilegios, el scoping de empresas completo y la purga cross-tenant.
Los caminos que ejercita —guards de RBAC, `CompaniesService`, la purga— **no se
han tocado desde entonces**: los commits posteriores cambian entidades
(transformer), `PaymentsService`, `InventoryLocationsService` y frontend de
ventas. Se declara vigente, no re-verificado.

## §6 Backup / restore / rollback

| Gate | Resultado |
|------|-----------|
| Backup con `scripts/db-backup.sh` | ✅ `pos_db_20260811-210256.sql.gz` (4,5 KB). El script valida con `gzip -t` **antes** de renombrar desde `.partial`, así que un archivo truncado no puede pasar por bueno |
| Restore en base scratch | ✅ `pos_scratch` creada con el charset/collation copiados del origen (`utf8mb4` / `utf8mb4_0900_ai_ci`) |
| Conteos origen vs restaurado | ✅ **11 de 11 coinciden**: companies, users, roles, products, customers, orders, order_items, payments, stock_movements, warehouses y las 16 tablas |
| Rollback por redeploy | ✅ Redeploy de `5447d600`: stack sano, `/health` + `/health/ready` + `/api/health` 200, login 200, y **datos y esquema intactos** — pedido, cliente, stock 29, pagos, movimientos y las 2 migraciones del ledger sin cambios. Roll-forward a `87b77828` igual de limpio |

Confirmado **Caso A** antes de ejecutarlo: `git diff` sobre
`backend/src/database/migrations/` entre ambos commits sale vacío, así que el
Redeploy basta y no hay que restaurar backup.

> No verificado de forma independiente: que el bundle desplegado durante el
> rollback fuera efectivamente el de `5447d600`. El gate exige "vuelve sano", y
> eso sí se comprobó.

## §7 Observabilidad

- ✅ Healthcheck cableado: `["CMD","wget","-qO-","http://localhost:3000/health"]`,
  interval 15s, 6 reintentos, estado `healthy`. Auto-restart activo.
- ✅ Logs estructurados con contexto de petición: `POST /auth/login → 401`,
  `GET /products → 200`. Las sondas de salud se excluyen a propósito.
- ✅ **Credenciales redactadas**: `"authorization":"[Redacted]"`; cero fugas de
  token o contraseña en claro en 144 líneas de log.

## Estado de los S-items que el sign-off pide registrar

| S-item | Estado | Propuesta |
|---|---|---|
| S-01 CI green & gating | ✅ cerrado (`SPEC-BACK-002`, lint como check requerido) | — |
| S-02 Observabilidad | Parcial: logging estructurado con redacción y `/health`+`/health/ready` listos; **Sentry no** | **fast-follow** |
| S-03 Backups | Scripts probados hoy de punta a punta; **automatización (cron/S3) no configurada** | **fast-follow, con fecha** |
| S-05 Secretos | ✅ cerrado por decisión (histórico no purgado; secretos nuevos generados) | — |
| S-06 Política de contraseñas | Mín. 10 con mayúscula, minúscula, dígito y símbolo, aplicada en los DTO | **fast-follow** |

## Recomendación

**Todo verde salvo §4-2.** El sistema vende correctamente de punta a punta —
importe correcto, venta cerrada, pagada, inventario descontado con rastro,
cliente adjunto, reportes cuadrando — y el backup, el restore y el rollback
funcionan.

Lo único rojo es **D3: no se puede dar de alta un producto desde la UI**. No
bloquea el camino de venta, pero sí la operación diaria de catálogo, y hoy solo
se puede sortear por API. Es una corrección de DTO comparable a las ya hechas.

**Esa es la decisión del operador**, y de ahí depende el veredicto:

- **NO-GO** si dar de alta productos desde la UI es requisito de go-live.
- **GO con fast-follow** si el catálogo inicial se carga por migración o API y D3
  se corrige en la primera iteración.

| | |
|---|---|
| Ejecutado por | Claude Opus 5 (sesión asistida), 2026-08-11 |
| Secciones verdes | §4 (4 de 5), §5 (vigente de la 1ª pasada), §6, §7 |
| **Go / No-Go** | 🟢 **GO** |
| **Operador** | **Gandhi Olavi** |
| **Fecha de firma** | **2026-08-11** |

**Razón del GO, y su condición.** El sistema vende de punta a punta con el
importe correcto, cierra la venta, descuenta inventario dejando rastro, adjunta
el cliente y cuadra los reportes; el backup, el restore y el rollback funcionan
sobre la instancia real. El único item rojo, **D3** (no se puede dar de alta un
producto desde la UI), no toca el camino de venta: el catálogo inicial se carga
por API o migración. Se acepta como **fast-follow**, con item propio en
`SPEC-BACK-004`, y es el primero de la siguiente iteración.

**Fast-follow acordados en esta firma:** D3 (`SPEC-BACK-004`), S-02 Sentry,
S-03 automatización de backups a S3 con retención, S-06 política de contraseñas.
Y los cuatro huecos nombrados en `SPEC-BACK-003`: el `retry` global del
QueryClient, el bloqueo pesimista sin ejercitar bajo concurrencia real, la
divergencia entre los dos libros de inventario, y `refundPayment` sin guarda de
exactamente-una-vez.
