# Prompt para nueva sesión — SPEC-BACK-004 + venta sin existencias

Copia lo que sigue tal cual como primer mensaje de la sesión.

---

Trabajamos en `/home/gor/devs/pos-modernization`, rama `main`. El POS está
desplegado y en producción (Coolify en el VPS local `10.0.50.20`, expuesto por
Cloudflare Tunnel en `facturame.automatizate.dev` / `facturame-api.automatizate.dev`;
entras con `ssh vps-automatizate`). El dry-run de cutover se firmó con **GO** el
2026-08-11 — acta en `new-implementation/STAGING-DRY-RUN-RESULTS.md`.

Hay **dos cosas** en esta sesión, y quiero que salgan como un solo ciclo de
diseño porque tocan el mismo código:

## A. Cerrar D3 — no se puede dar de alta un producto desde la UI

Es el único item rojo que dejó el dry-run, ya está diagnosticado, y su spec
existe: `docs/specs/SPEC-BACK-004-product-create-dto.md` (en DRAFT, con el
problema, la causa y los criterios de aceptación ya escritos).

Resumen: `POST /products` devuelve 400 desde el formulario porque
`dto/create-product.dto.ts` exige `company_id` y `created_by` al cliente —deben
salir del JWT, como hace todo el resto del código (`usersService.create(currentUser.company_id, …)`)—,
pide `reorder_level` que el formulario no tiene, y su regex de SKU
`/^[A-Z0-9]+$/` rechaza guiones mientras el placeholder del propio campo es
`PRD-001`.

**No pierdas la guarda existente**: el servicio ya rechaza con 401
(`Cannot create product for another company`) si le pasas un `company_id` ajeno.
Eso debe seguir funcionando y necesita test de regresión.

## B. Vender sin existencias — nueva funcionalidad

Quiero poder vender un producto aunque no haya stock. Dos cosas que descubrí y
que deberían anclar el diseño:

1. **El sistema legado ya lo tiene, y es por producto.** La tabla `inventarios`
   de `info/bd_ex.sql` trae `EsFactSinExistencia tinyint(4) NOT NULL DEFAULT 0`.
   La regla de migración actual (`migration/src/rules/products.rule.ts`) **no la
   mapea**, así que hoy se descarta al migrar. Si el diseño la adopta, la regla
   debería mapearla y habría que re-correr el parity de `SPEC-MIGR-001`.
2. **El stock se valida en cuatro sitios**, no en uno. Cualquier diseño tiene que
   cubrirlos todos o decir explícitamente cuál queda fuera:
   - `sales/services/sales.service.ts:113` — al crear el pedido
   - `sales/services/payments.service.ts:160` — al cobrar, dentro de la
     transacción y con bloqueo pesimista (esto es reciente, de `SPEC-BACK-003`)
   - `products/products.service.ts:166` — `deductStock`, la vía `CONFIRMED`
   - `inventory/services/stock.service.ts:106,170`
   Y en el frontend, `app/(panel)/sales/page.tsx` bloquea añadir al carrito por
   `product.stock_quantity === 0` y por `existing.quantity >= product.stock_quantity`.

Preguntas de diseño que quiero decidir contigo, no que asumas: ¿bandera por
producto (como el legado), ajuste global, o ambas con precedencia? ¿el stock
puede quedar negativo o se queda en cero? ¿la caja avisa al cajero? ¿qué pasa con
`stock_movements` cuando se vende algo que no existe?

## Cómo quiero que trabajes

El ciclo completo de Superpowers: **brainstorming → spec → plan → ejecución por
subagentes con revisión entre tareas**. En la sesión anterior ese proceso
encontró dos defectos Critical que los tests en verde no habrían detectado, así
que no lo abrevies.

Convenciones del repo que importan (están en `CLAUDE.md`, pero por si acaso):

- La línea `**Status**:` de los specs es el ledger. Formato
  `<TOKEN> — <fecha> (PR #N). <qué shipeó / qué queda abierto>`. Nunca
  `IMPLEMENTED`. El guard de Kairos es monotónico: no se puede retroceder.
- Un PR solo cierra un issue con keyword explícita (`Closes POS-BACK-004`).
- **Verificación por mutación obligatoria** en cada test: revierte el arreglo,
  comprueba que el test se pone rojo, cítalo. En la sesión anterior propuse un
  ancla que un implementador refutó con evidencia — resultó que no habría
  detectado el bug que pretendía cubrir.
- Lo que un unitario no puede probar, pruébalo contra el despliegue. El
  transformer de DECIMAL pasó todos los tests y solo la API real demostró que
  las entidades lo usaban.

## Entorno, para que no lo redescubras

- Backend: `cd new-implementation/backend && npx jest --testPathPattern "<x>"`;
  suite completa `npm test` (278 tests); tipos `npx tsc --noEmit -p tsconfig.json`.
- Frontend: `npx tsc --noEmit` y `npm run lint`. Hay lint de i18n: las cadenas
  visibles van en el catálogo y `messages/es.json` / `messages/en.json` deben
  tener paridad.
- Los tests que usan `@Type` de class-transformer necesitan
  `import 'reflect-metadata';` en la primera línea.
- `backend/node_modules` está **trackeado en git e incompleto**: un worktree no
  puede correr la suite. Trabaja en rama sobre el árbol principal.
- **No puedes disparar el despliegue**: los redespliegues en Coolify los hago yo.
  Pídemelos cuando los necesites.
- Los commits entran a `main` sin PR ni checks (`enforce_admins` desactivado).
  No lo aproveches: abre rama y pídeme el merge.

## Contexto que puede ahorrarte tiempo

`SPEC-BACK-003` dejó cuatro huecos nombrados en su status line, y uno roza esto:
**hay dos contabilidades de inventario que no se hablan** — las ventas descuentan
`products.stock_quantity` y escriben `stock_movements`, pero nunca tocan
`warehouse_locations.current_stock`, y la ubicación que se crea bajo demanda nace
con `capacity: 0`, así que `StockService` rechaza toda operación sobre ella. Si
al diseñar B te topas con eso, no lo arregles de paso: es un item propio y más
grande. Dímelo y lo separamos.
