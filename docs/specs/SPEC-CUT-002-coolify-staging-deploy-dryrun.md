# M1 — Coolify Staging Dry-Run & Production Go-Live

**Status**: DONE — 2026-08-11. **Go/No-Go firmado: 🟢 GO, operador Gandhi Olavi** ([acta](../../new-implementation/STAGING-DRY-RUN-RESULTS.md)). Dry-run completo §4–§7 sobre la instancia Coolify (`facturame_app_modern`, VPS 10.0.50.20, Cloudflare Tunnel), con la base **inicializada desde cero** tras borrar el volumen — 16 tablas por migraciones, empresa y admin por bootstrap, cero datos heredados. §4 en 4 de 5 (navegador real): login, venta en ≤4 clics con importe correcto y pedido `completed`/`paid`, cliente real adjunto con búsqueda por nombre acertando en las tres variantes (parcial, minúsculas contra mayúscula, con tilde), y reportes cuadrando incluido «Revenue by Payment Method». §6 completo: backup y restore con los scripts del repo desde un contenedor cliente unido a la red del stack — **11 de 11 conteos coinciden** —, y rollback por redeploy devolviendo un stack sano con datos y esquema intactos, confirmado antes como **Caso A**. §7 verde: healthcheck cableado a `/health` con auto-restart, logs con contexto de petición y la cabecera `Authorization` **redactada**. §5 no se re-ejecutó y se declara **vigente, no re-verificado**: se comprobó entero contra `a826c31c` y sus caminos (guards de RBAC, `CompaniesService`, purga cross-tenant) no se han tocado desde entonces. **Condición del GO:** el único item rojo es **D3** — no se puede dar de alta un producto desde la UI —, aceptado como fast-follow porque no toca el camino de venta y el catálogo inicial se carga por API o migración; item propio en `SPEC-BACK-004`. Fast-follow además: S-02 Sentry, S-03 automatización de backups, S-06 política de contraseñas, y los cuatro huecos de `SPEC-BACK-003`. **No verificado de forma independiente:** que el bundle desplegado durante el rollback fuera el del commit destino; el gate exige «vuelve sano», y eso sí se comprobó. La 1ª y 2ª pasada (veredicto NO-GO) quedan en el acta como historia.
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
