# M2 — Alta de producto desde la UI (D3) + venta sin existencias

**Status**: DRAFT — 2026-08-11. Único item rojo del dry-run firmado con GO ([acta](../../new-implementation/STAGING-DRY-RUN-RESULTS.md)); aceptado como fast-follow porque no toca el camino de venta, y es el primero de la siguiente iteración.

**Owner**: gandhi
**Created**: 2026-08-11
**Modules**: M2 BACK (primary), M3 FRONT
**Plane**: mapea a M2 por el `default` de `_modules.yml`

---

## 1. Problema

`POST /products` desde el formulario de la UI devuelve **400**. Medido contra el
despliegue real:

```json
{"message":[
  "SKU must contain only uppercase letters and numbers",
  "reorder_level must not be less than 0",
  "reorder_level must be a number conforming to the specified constraints",
  "company_id must be a UUID",
  "created_by must be a UUID"
]}
```

Consecuencia: **no se puede dar de alta un producto desde la aplicación.** El
catálogo solo se puede poblar por API con un payload construido a mano, o por
migración.

## 2. Causa

`dto/create-product.dto.ts` exige del cliente tres cosas que no le corresponden
o que contradicen a la propia UI:

- **`company_id` y `created_by` obligatorios.** Deben venir del JWT, como hace
  todo el resto del código (`usersService.create(currentUser.company_id, …)`).
  El servicio ya rechaza un `company_id` ajeno con 401 (`Cannot create product
  for another company`), así que **no es un agujero de seguridad** — es un
  defecto de diseño de la API que además rompe el formulario.
- **`reorder_level` obligatorio**, mientras el formulario no tiene ese campo.
- **`@Matches(/^[A-Z0-9]+$/)` en `sku`**, que rechaza guiones… siendo que el
  placeholder del propio campo en la UI es `PRD-001`.

## 3. Acceptance

- [ ] Un producto se crea desde el formulario de la UI, sin payload a mano.
- [ ] `company_id` y `created_by` salen del JWT; el DTO ya no los pide.
- [ ] Sigue devolviendo 401 al intentar crear en otra empresa (no perder la
      guarda existente — test de regresión).
- [ ] `reorder_level` es opcional con defecto, o el formulario lo expone.
- [ ] El regex de SKU acepta lo que el placeholder promete, o el placeholder
      cambia. Una de las dos, no ambas.
- [ ] `STAGING-DRY-RUN.md` §4-2 en verde, en navegador real.

## 4. Venta sin existencias (añadido 2026-08-11)

Poder vender un producto aunque no haya stock. **No es funcionalidad nueva: el
legado ya la tiene, y por producto** — `inventarios.EsFactSinExistencia
tinyint(4) NOT NULL DEFAULT 0` en `info/bd_ex.sql`. La regla de migración
(`migration/src/rules/products.rule.ts`) **no la mapea hoy**, así que se descarta
al migrar; si el diseño la adopta, habría que mapearla y re-correr el parity de
`SPEC-MIGR-001`.

**El stock se valida en cuatro sitios**, y cualquier diseño debe cubrirlos todos
o decir explícitamente cuál queda fuera:

| Punto | Qué valida |
|---|---|
| `sales/services/sales.service.ts:113` | al crear el pedido |
| `sales/services/payments.service.ts:160` | al cobrar, dentro de la transacción con bloqueo pesimista (de `SPEC-BACK-003`) |
| `products/products.service.ts:166` | `deductStock`, la vía `CONFIRMED` |
| `inventory/services/stock.service.ts:106,170` | ajustes de inventario |

Más el frontend: `app/(panel)/sales/page.tsx` bloquea añadir al carrito por
`stock_quantity === 0` y por `quantity >= stock_quantity`.

### Decisiones pendientes (no asumir)

- ¿Bandera por producto como el legado, ajuste global, o ambas con precedencia?
- ¿El stock puede quedar negativo, o se queda en cero?
- ¿La caja avisa al cajero de que está vendiendo sin existencias?
- ¿Qué se escribe en `stock_movements` al vender algo que no existe?

## 5. Fuera de alcance

El resto de defectos del catálogo, si los hubiera. Y la **divergencia entre los
dos libros de inventario** (`products.stock_quantity` vs
`warehouse_locations.current_stock`, con la ubicación auto-creada en
`capacity: 0`): es un item propio y mayor, anotado en `SPEC-BACK-003`.
