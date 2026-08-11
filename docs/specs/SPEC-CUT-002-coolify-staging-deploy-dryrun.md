# M1 — Coolify Staging Dry-Run & Production Go-Live

**Status**: DRAFT — 2026-08-11, **2ª pasada (commit `97695db4`): el veredicto sigue siendo 🔴 NO-GO y es peor que el primero.** D1, D2 y D5 corregidos y verificados: el catálogo carga y la venta se completa en 4 clics. Pero al poder ejecutarse por fin, §4-3 destapó tres defectos que los bloqueantes anteriores ocultaban, y ninguno es de una línea: **D7** la caja muestra `Total $25.000` mientras el backend registra `29750.00` (`subtotal 25.000 + IVA 4.750`) — **se cobra $4.750 menos de lo que se registra en cada venta**; **D6** `payment_method`/`payment_status` los descarta el `ValidationPipe` (`whitelist: true`) porque el DTO no los declara, así que toda venta nace `draft`/`unpaid` y `payments` queda vacía; **D8** la venta no descuenta inventario (stock 50 → 50 tras dos pedidos, `stock_movements` vacía). §4-4 y §4-5 siguen **NO EJECUTADOS**: informar sobre pedidos `draft`/`unpaid` no probaría nada. §5 no se re-ejecutó y sus resultados siguen vigentes — nada de D5–D8 toca seguridad. **Estos tres requieren decisión de diseño antes que código** (¿el `create` acepta el pago o el frontend llama a `POST /sales/orders/:id/payments`?; quién calcula el total mostrado; dónde se descuenta el stock), y esa decisión es del operador. Detalle en el addendum del acta. Lo que sigue es el registro de la 1ª pasada. — **el dry-run se ejecutó y el veredicto es 🔴 NO-GO**; acta completa en [`STAGING-DRY-RUN-RESULTS.md`](../../new-implementation/STAGING-DRY-RUN-RESULTS.md#dry-run-4-5-sobre-coolify--2026-08-11--veredicto--no-go). Ya no está bloqueado por falta de instancia: hay un Coolify vivo (`facturame_app_modern`, VPS 10.0.50.20, expuesto por Cloudflare Tunnel), commit `a826c31c`. **Salvedad de alcance: se corrió contra el propio destino de go-live, no contra un staging aparte como pide §1** — la base estaba vacía y se eligió probar el binario real; §4 de esta spec presupone dos entornos y aquí hay uno. §5 (seguridad) **pasa entero** en lo ejecutable: RBAC de cajero (nav oculta + redirects + 403 de backend), los tres límites de escalada de privilegios con el mensaje exacto que cita la spec, el scoping de empresas completo (404 y no 403 para la ajena, fila intacta tras el PATCH rechazado, superadmin ve ambas) y la purga cross-tenant (`{"deleted":2}`, las 3 de la otra empresa intactas) — esta última con notificaciones sembradas a 45/60 días, porque el sistema se creó hoy. §4 (smoke) **falla de forma bloqueante en el item 3**: el POS no puede registrar una venta. Dos defectos, ambos de pocas líneas: **D1** `product-query.dto.ts` combina `@Transform` a booleano con `@IsString()` y un valor por defecto, así que `GET /products` devuelve 400 **siempre** y el catálogo nunca carga; **D2** todo `lib/api/sales.ts` apunta a `/sales*` cuando el backend sirve `/sales/orders*` (7 rutas, todas 404). Los items 4 y 5 de §4 quedan **NO EJECUTADOS** por depender del 3, igual que el aislamiento en reports/customers de §5. **Abierto:** corregir D1/D2, redesplegar y repetir §4; el ensayo de backup/rollback-by-redeploy (§6); y la firma del operador — el acta deja la línea en blanco a propósito, la recomendación NO-GO la emitió quien ejecutó las pruebas, no el operador. Nota para quien repita esto: el *pass gate* de §4 dice "no 5xx" y **no hubo ningún 5xx** — los dos bloqueantes son 400 y 404; ese gate necesita reescribirse.
**Owner**: gandhi
**Created**: 2026-07-07
**Modules**: M1 INFRA (primary), M2 BACK, M3 FRONT
**Plane**: maps to M1 via `_modules.yml` (`SPEC-*-deploy*.md`)

---

## 1. Goal

Execute the full cutover dry-run on a **real Coolify staging instance** and
record a Go / No-Go, closing the infrastructure-level exit criteria that a local
run provably cannot. `SPEC-CUT-001` is **APPROVED** — complete at the **app
level**, its blockers (B-01…B-10) verified on a local prod-parity stack (see
`../../new-implementation/STAGING-DRY-RUN-RESULTS.md`). This spec covers the
gates that only exist on Coolify + real DNS.

**Done when** a fresh Coolify staging deploy passes the entire
`new-implementation/STAGING-DRY-RUN.md` checklist end-to-end, with the
Coolify-only gates below green, and a Go/No-Go is recorded with date + operator.

## 2. Why a local run isn't enough

The local pre-flight used a self-contained compose stack (localhost, exposed
MySQL port, no subdomains). These gates were **out of reach** and remain open:

| Gate | Why local can't cover it |
|------|--------------------------|
| **Subdomain CORS** (B-02 in prod form) | Local origin is `localhost:3001`, not real `app.`/`api.` subdomains; the browser preflight against the deployed origin is the actual test. |
| **MySQL port-not-exposed** | Compose maps `3308:3306`; Coolify staging must provision MySQL with **no** public port. |
| **Rollback-by-redeploy** (§6) | Requires redeploying the previous Coolify image/commit and confirming a healthy stack — migrations are **forward-only**, so rollback must target a commit whose migrations already ran. |
| **Coolify healthcheck + observability** (S-02) | `/health` liveness + `/health/ready` readiness wired to the Coolify auto-restart healthcheck; log reachability in the Coolify UI. |

## 3. Tasks

1. Provision Coolify staging: MySQL 8.0 (port **not** exposed, strong
   `DB_PASSWORD`); `api.`/`app.` staging subdomains.
2. Generate fresh secrets in Coolify env only (never git) —
   `openssl rand -base64 48` for JWT secrets, strong `BOOTSTRAP_ADMIN_PASSWORD`
   (min 12). Do **not** reuse any historical `.env` values (S-05 procedural rule).
3. Deploy backend (`DB_RUN_MIGRATIONS=true`, `CORS_ORIGINS=https://app.<domain>`):
   confirm `validateProductionEnv` passes, `InitialSchema…` + `Bootstrapped admin`
   log lines, `/health` + `/health/ready` green, ~15 tables.
4. Deploy frontend (`NEXT_PUBLIC_API_URL=https://api.<domain>`): `/login` renders,
   **no CORS errors** in the browser console.
5. Run `STAGING-DRY-RUN.md` §4 smoke (login → catalog → sale → customer → report)
   and §5 security (RBAC + tenant isolation B-01 regression). The admin path now
   works post-B-10 — verify the ≤4-click sale for real.
6. Backup/restore + **rollback-by-redeploy** rehearsal (§6).
7. Record Go/No-Go + triage remaining S-items (S-02 obs, S-03 backup automation)
   as fix-now vs fast-follow.

## 4. Acceptance / exit criteria

- [ ] Coolify-only gates (§2 table) all green on staging.
- [ ] `STAGING-DRY-RUN.md` §4 + §5 pass end-to-end (real browser, not curl).
- [ ] Backup restore verified + rollback-by-redeploy returns a healthy stack.
- [ ] Go/No-Go recorded (date + operator) in `STAGING-DRY-RUN.md` sign-off.
- [ ] Only after GO: production cutover scheduled separately.

## 5. Out of scope

App-level blockers (closed in `SPEC-CUT-001`); RBAC role-provisioning
(`SPEC-BACK-001`); legacy data migration (`SPEC-MIGR-001`); fiscal platform
(`SPEC-FISC-001`).

## 6. References

- `../../new-implementation/STAGING-DRY-RUN.md` — executable checklist.
- `../../new-implementation/STAGING-DRY-RUN-RESULTS.md` — local pre-flight record.
- `../../new-implementation/DEPLOYMENT-COOLIFY.md` — Coolify deploy procedure.
- `SPEC-CUT-001-cutover-deploy-readiness.md` — app-level readiness (APPROVED;
  promoted to DONE when this spec records its Go/No-Go).
