# M2 — Alta de producto desde la UI (D3) + venta sin existencias

**Status**: APPROVED — 2026-08-11. Diseño aprobado y escrito en [2026-08-11-product-create-and-oversell-design.md](../superpowers/specs/2026-08-11-product-create-and-oversell-design.md); nada implementado todavía. Único item rojo del dry-run firmado con GO ([acta](../../new-implementation/STAGING-DRY-RUN-RESULTS.md)); aceptado como fast-follow porque no toca el camino de venta, y es el primero de la siguiente iteración.

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
- [ ] Un `company_id` ajeno en el body **no crea producto en esa empresa**: el
      producto nace en la empresa del JWT.
- [ ] `reorder_level` es opcional con defecto, o el formulario lo expone.
- [ ] El regex de SKU acepta lo que el placeholder promete, o el placeholder
      cambia. Una de las dos, no ambas.
- [ ] `STAGING-DRY-RUN.md` §4-2 en verde, en navegador real.

> **El criterio del 401 se corrigió el 2026-08-11.** Decía "sigue devolviendo
> 401 al intentar crear en otra empresa (test de regresión)". Es intestable tal
> como estaba escrito: `main.ts:56` usa `ValidationPipe({ whitelist: true })`
> sin `forbidNonWhitelisted`, así que al quitar `company_id` del DTO el campo se
> descarta en silencio y `createProductDto.company_id !== user.company_id` nunca
> puede dispararse — la guarda queda muerta. Se sustituye por su invariante
> real, que es más fuerte porque no depende de que el atacante mande el campo.
> Detalle en el design doc §1.

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

### Decisiones (cerradas 2026-08-11)

Diseño completo en
[2026-08-11-product-create-and-oversell-design.md](../superpowers/specs/2026-08-11-product-create-and-oversell-design.md).

- **Precedencia:** `producto.allow_sale_without_stock ?? settings.allowNegativeStock`.
  Columna nueva tri-estado (`NULL` = heredar). Reproduce el legado: los 272
  productos con `EsFactSinExistencia = 0` siguen bloqueados aunque el global
  esté encendido.
- **Negativo, no suelo en cero.** 7.809 filas legadas (25,8 %) ya tienen
  `CantFisica` negativa y la migración la preserva a propósito; un suelo en cero
  contradiría datos ya migrados.
- **Aviso al cajero:** distintivo visible, sin bloquear ni pedir confirmación
  (el 99,1 % del catálogo está habilitado; un diálogo sería fatiga de alertas).
- **`stock_movements`:** mismo `OUT`, con la nota marcada
  `Venta <order_number> (sin existencias)`. Sin `MovementType` nuevo.
- **El interruptor global ya existe, ya está en la UI y hoy no hace nada.**
  `settings.allowNegativeStock` se renderiza en `/settings` y ningún punto de
  validación lo lee. Su default se unifica en `false` (el DDL dice `DEFAULT 1`,
  el servicio escribe `false`) y se resetea a `0` en las filas existentes: hoy
  el valor guardado no expresa intención, y al cablearlo pasa a ser carga viva.
- **`stock.service.ts` queda fuera de alcance**, con motivo: es el otro libro de
  inventario, ya roto por `capacity: 0`. Ver §5.
- **SKU:** se relaja el regex a `/^[A-Z0-9][A-Z0-9._-]*$/` con normalización a
  mayúsculas. Los 30.276 SKUs legados son `[A-Z0-9]+` puro, así que ninguno se
  invalida.

## 5. Fuera de alcance

**La categoría del formulario, que se pierde en silencio** — ítem propio en
[`SPEC-BACK-005`](SPEC-BACK-005-product-category-binding.md). `ProductForm` manda
`category` (un nombre en texto libre) mientras el DTO declara `category_id` con
`@IsUUID()`; como `category` no lleva decoradores, `whitelist: true` la descarta
**sin error**. La verificación de D3 pasa en verde con este defecto vivo, así
que queda anotado para que cerrar D3 no lo tape.

`inventory/services/stock.service.ts` y el libro de `warehouse_locations`.
Verificado que dejarlo fuera no bloquea la venta sin existencias:
`deductStockOnOrder` no tiene ni un solo llamador — el camino de venta nunca lo
alcanza.

El resto de defectos del catálogo, si los hubiera. Y la **divergencia entre los
dos libros de inventario** (`products.stock_quantity` vs
`warehouse_locations.current_stock`, con la ubicación auto-creada en
`capacity: 0`): es un item propio y mayor, anotado en `SPEC-BACK-003`.
