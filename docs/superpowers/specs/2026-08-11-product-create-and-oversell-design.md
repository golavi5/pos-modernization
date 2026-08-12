# Alta de producto y venta sin existencias — Design Spec

**Issue:** POS-BACK-004
**Status:** Approved

- **Spec ID:** 2026-08-11-product-create-and-oversell
- **Módulos:** M2 (BACK) principal, M3 (FRONT), M4 (MIGR)
- **Cierra:** D3 del dry-run del 2026-08-11, y añade la venta sin existencias

---

## Contexto

Dos trabajos que tocan el mismo código y salen como un solo ciclo:

**A.** `POST /products` devuelve 400 desde el formulario de la UI. Es el único
item rojo que dejó el dry-run firmado con GO. El detalle está en
`SPEC-BACK-004` §1–§2.

**B.** Vender un producto aunque no haya existencias. No es funcionalidad nueva:
el legado ya la tiene, por producto.

### Hallazgos que anclan el diseño

Cinco cosas medidas antes de diseñar. Cada una cambió una decisión.

1. **El interruptor global ya existe y ya está en la UI — y miente.**
   `settings.allowNegativeStock` ("Permitir stock negativo / *Permite ventas
   cuando stock es 0*") se renderiza en `app/(panel)/settings/page.tsx:315`, se
   persiste vía `PATCH /settings/inventory`, y **ningún punto de validación de
   stock lo lee**. Grep sobre `backend/src` y `frontend`: solo aparece en la
   entidad, su DTO, `settings.service.ts`, su test, la página de ajustes y los
   catálogos i18n. B no añade un control: cablea uno que hoy engaña al operador.

2. **Sus defaults se contradicen.** El DDL de `InitialSchema.ts:15` declara
   `allowNegativeStock tinyint NOT NULL DEFAULT 1`, mientras
   `settings.service.ts:44,130` crea las filas con `false`. Cablearlo sin
   unificar el default encendería la sobreventa en silencio para cualquier fila
   insertada sin la columna.

3. **En el legado la sobreventa es la norma, no la excepción.** De los 30.276
   productos de `inventarios` en `info/bd_ex.sql`, **30.004 (99,1 %)** traen
   `EsFactSinExistencia = 1`. Solo **272** lo tienen a 0 — y los 272 están
   activos (`EsActivo = 1`). Una lista de excepciones viva es lo que justifica
   una columna por producto en vez de un ajuste global a secas.

4. **El stock negativo ya está en la base.** **7.809 filas legadas (25,8 %)**
   tienen `CantFisica` negativa, y `migration/src/rules/products.rule.ts`
   preserva el negativo a propósito ("incl. negative stock"). Hoy esos productos
   son invendibles en el POS nuevo. Un suelo en cero contradiría datos ya
   migrados: queda descartado.

5. **`GET /settings` es `@Roles('admin','manager')`: un cajero no puede
   leerlo.** Eso decide dónde se resuelve la regla (§4).

Medición 3 y 4, reproducible: parseo de las filas de `INSERT INTO inventarios`
del dump, contando la columna 16 (`EsFactSinExistencia`) y la 9 (`CantFisica`).

---

## 1. Alta de producto (D3)

### Qué

`CreateProductDto` deja de pedir lo que no le corresponde:

- **fuera `company_id` y `created_by`** — salen del JWT, como en el resto del
  código (`usersService.create(currentUser.company_id, …)`);
- **`reorder_level` pasa a `@IsOptional()`** — la columna ya es `default: 0` y
  el formulario no expone el campo;
- **`sku`** gana `@Transform` (trim + `toUpperCase`) y el regex pasa a
  `/^[A-Z0-9][A-Z0-9._-]*$/`;
- **entra `allow_sale_without_stock?: boolean | null`** (§2);
- **los opcionales de texto normalizan `''` a `undefined`** (`barcode`,
  `image_url`, `description`) — ver abajo.

### Dos blockers más que la spec no lista, medidos

`SPEC-BACK-004` §1 recoge el 400 tal como se observó en el dry-run, pero ese
payload tenía código de barras e imagen rellenos. Validando el DTO actual contra
lo que el formulario manda **con esos campos vacíos**, que es el caso normal,
aparecen dos errores más:

```
barcode    must be longer than or equal to 1 characters
image_url  must be a URL address
```

Causa: `@IsOptional()` de class-validator solo ignora `null` y `undefined`, no
`''`. El formulario inicializa `barcode: ''` e `image_url: ''`
(`ProductForm.tsx:43-53`) y `lib/api/products.ts` los manda tal cual, sin
limpiar. **Arreglar solo los tres defectos conocidos dejaría el formulario
igual de roto**, con un 400 distinto.

Se corrige en el DTO, no en el formulario: la API no debe rechazar `""` en un
campo opcional venga de donde venga.

```ts
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
```

### Por qué el regex y no el placeholder

Los **30.276** SKUs del legado son estrictamente `[A-Z0-9]+`: ni un guion, ni un
punto, ni una minúscula. El regex actual no choca con el catálogo real — choca
solo con el placeholder `PRD-001` de la propia UI. Relajarlo no rompe nada
migrado y evita el 400 al operador que teclea un guion o una minúscula por
costumbre. `'prd-001'` → `PRD-001`; `'1'` sigue siendo válido; el espacio sigue
prohibido.

### El punto que rompe si se hace mal

`ProductsService.create` hace hoy
`this.productRepository.create({ ...createProductDto, created_by: user.id })`.
El `company_id` entra por el spread del DTO. **Al quitarlo del DTO, la columna
NOT NULL se queda sin valor y falla en el insert, no en compilación.** La
asignación pasa a ser explícita:

```ts
const product = this.productRepository.create({
  ...createProductDto,
  company_id: user.company_id,
  created_by: user.id,
});
```

### La guarda 401: cambio de criterio, no pérdida de la guarda

`main.ts:56` usa `new ValidationPipe({ whitelist: true, transform: true })`, sin
`forbidNonWhitelisted`. Quitado `company_id` del DTO, un `company_id` en el body
se **descarta en silencio** antes de llegar al servicio, así que
`createProductDto.company_id !== user.company_id` es inalcanzable: la guarda
queda muerta y el "test de regresión del 401" que pide `SPEC-BACK-004` §3 es
intestable tal como está escrito.

**Decisión:** se borra la guarda muerta y el criterio de aceptación se sustituye
por su invariante real, que sí es verificable y es más fuerte porque no depende
de que el atacante mande el campo:

> Un `company_id` ajeno en el body **no crea producto en esa empresa**: el
> producto nace en la empresa del JWT.

Descartado: mantener `company_id` opcional en el DTO solo para poder devolver
401. Conservaría un campo de API que nadie debe mandar y cuya única función es
fallar.

---

## 2. Modelo de la venta sin existencias

```
puedeVenderSinStock(producto, settings) =
    producto.allow_sale_without_stock ?? settings.allowNegativeStock
```

**Tri-estado por producto, con el ajuste global como defecto.** Columna nueva
`products.allow_sale_without_stock tinyint NULL` — `NULL` significa "heredar".
Reproduce el legado exacto: los 272 productos con `EsFactSinExistencia = 0`
siguen bloqueados aunque el interruptor global esté encendido, y los 30.004
heredan su `true` propio al migrar.

Descartados:

- **OR** (`global || producto`): encender el global anularía la lista de 272
  excepciones y no quedaría forma de bloquear un producto concreto.
- **Solo global**: tira la lista de excepciones y deja sin sentido el mapeo de
  `EsFactSinExistencia`.

La regla vive en **una función pura** compartida por los tres puntos de §3, no
en tres copias del `??`.

### El default global, que sí toca producción

Se unifica en **`false`**: `@Column({ default: false })` en la entidad, `ALTER`
del default a `0` en la migración, y **`UPDATE settings SET allowNegativeStock =
0`** sobre las filas existentes.

Razón: hoy el interruptor es inerte, así que su valor guardado no expresa
ninguna intención del operador — y en cuanto se cablee pasa a ser carga viva.
Encenderlo tiene que ser un acto deliberado. El catálogo legado no lo necesita:
sus 30.004 productos llegan con su propia bandera en `true`.

---

## 3. Los cuatro puntos de validación de stock

| Punto | Qué se hace |
|---|---|
| `sales/services/sales.service.ts:113` — crear pedido | salta la excepción de stock insuficiente si `puedeVenderSinStock` |
| `sales/services/payments.service.ts:160` — cobro, dentro de la transacción con bloqueo pesimista | ídem; `stock_quantity` puede quedar negativo; la nota del movimiento se marca |
| `products/products.service.ts:166` — `deductStock`, vía `CONFIRMED` | ídem |
| `inventory/services/stock.service.ts:106,170` | **fuera de alcance** |

**`stock.service.ts` queda fuera con motivo declarado:** es el *otro* libro de
inventario (`warehouse_locations.current_stock` / `capacity`), no el que
descuentan las ventas. Su comprobación `newStock > location.capacity` ya está
rota para toda ubicación auto-creada (`capacity: 0`). Es el ítem propio y mayor
anotado en `SPEC-BACK-003`; tocarlo aquí lo mezclaría con esto.

**`stock_movements`:** cuando la venta deja el stock en negativo se escribe el
mismo `movement_type: OUT` con la misma cantidad, y la nota pasa a
`Venta <order_number> (sin existencias)`. Sin cambio de esquema, sin romper
informes que agrupen por tipo, y con rastro de *cuándo* el inventario se fue a
negativo. Descartado un `MovementType.OVERSELL`: exigiría `ALTER` del enum en
MySQL y todo consumidor de `movement_type` tendría que aprender el valor nuevo o
lo perdería en silencio.

**Sólo la vía de cobro escribe movimientos.** `deductStock` (vía `CONFIRMED`) no
escribe en `stock_movements` en absoluto — hueco preexistente, documentado aquí,
no arreglado aquí. La nota marcada solo aterriza en la vía de `payments`.

**Cableado de módulos:** `SalesModule` y `ProductsModule` importan
`SettingsModule`, que ya exporta `SettingsService`.

---

## 4. Frontend

### Dónde se resuelve la regla, y por qué ahí

`GET /settings` está limitado a `@Roles('admin','manager')`
(`settings.controller.ts`), así que **un cajero no puede leer
`allowNegativeStock`**. La caja no resuelve la regla: la resuelve el backend y
la API de productos devuelve el booleano **ya resuelto**
`can_sell_without_stock`. Sin endpoint nuevo y sin ampliar los permisos de
ajustes, que expondrían a la caja la configuración de pagos, fidelización y
empresa.

Nota de implementación: `ProductResponseDto` es hoy solo una anotación de tipo
en el controlador — no hay `ClassSerializerInterceptor` ni `plainToInstance`, así
que sus `@Exclude()`/`@Expose()` no se ejecutan y lo que viaja es la entidad. El
campo resuelto se añade al objeto que devuelve el servicio, y el DTO se
actualiza para que el contrato declarado no mienta.

### Las dos guardas de la caja, y el bug que arrastran

Son **tres** guardas, no dos: además de `page.tsx:46,51`,
`components/sales/ProductSearch.tsx:79-83` calcula `outOfStock` y pone
`disabled` en la tarjeta, así que un producto sin existencias hoy ni siquiera se
puede pulsar. Las tres pasan a mirar `can_sell_without_stock`. De
paso corrigen un defecto vivo: la condición actual es `stock_quantity === 0`,
que **no bloquea los negativos**. Con 7.809 productos ya en negativo, hoy se
añaden al carrito y revientan con 400 en el backend. La comparación pasa a
`<= 0`.

### Aviso al cajero

Distintivo visible, sin bloquear ni pedir confirmación. Con el 99 % del catálogo
habilitado, un diálogo saltaría todo el día y el cajero lo aceptaría a ciegas.

- Tarjeta de producto y línea del carrito: marca "Sin existencias".
- Carrito: aviso agregado (`N artículos se venden sin existencias`).
- Cadenas en `messages/es.json` y `messages/en.json`, con paridad.

### Formulario de producto

`ProductFormFields` gana un selector tri-estado: *Heredar del ajuste global* /
*Sí* / *No*, que mapea a `null` / `true` / `false`.

---

## 5. Migración legada

`migration/src/rules/products.rule.ts` mapea `EsFactSinExistencia` →
`allow_sale_without_stock` copiando la forma de la línea de `EsActivo`:

```ts
{ from: 'EsFactSinExistencia', to: 'allow_sale_without_stock',
  transform: (v) => !!Number(v), verify: 'ignore' },
```

`verify: 'ignore'` no es pereza: con `verify: 'exact'` el `1` del tinyint legado
se compararía contra el `true` del booleano nuevo y pondría rojo el parity.

Hay que **re-correr el parity de `SPEC-MIGR-001`** contra el dump real y
actualizar su registro de verificación: la regla cambia, y un informe verde solo
prueba la revisión que lo produjo.

---

## 6. Fuera de alcance, y por qué

- **`stock.service.ts` y el libro de `warehouse_locations`** — §3.
- **`deductStock` sin `stock_movements`** — hueco preexistente; arreglarlo aquí
  mezclaría un cambio de contabilidad con este.
- **`checkReorderLevels` y `StockBadge`**: `stock_quantity <= reorder_level`
  marca como stock bajo permanente todo producto sobrevendido. Ya pasa hoy con
  los 7.809 negativos migrados; esta spec no lo empeora ni lo arregla.
- **El resto de defectos del catálogo**, si los hubiera.

---

## 7. Verificación

- **Unitarios con verificación por mutación en cada punto:** revertir el arreglo
  y comprobar que el test se pone rojo, citándolo. Un test que sigue verde con
  el arreglo revertido no prueba nada.
- Cobertura mínima: DTO (sku normalizado y aceptado/rechazado, `reorder_level`
  ausente), `create` (el producto nace en la empresa del JWT aunque el body
  mande otra), los tres puntos de stock con la bandera en `true`, `false` y
  `null` heredando de cada valor del global, y la nota del movimiento.
- **Contra el despliegue real**, que es lo que ningún unitario prueba: alta de
  producto desde el navegador (§4-2 de `STAGING-DRY-RUN.md`) y una venta sin
  existencias de punta a punta, comprobando el `stock_quantity` negativo y la
  fila de `stock_movements`.
- Puertas de CI: `lint:ci` en backend y frontend, `npx tsc --noEmit` en ambos, y
  los dos scripts de i18n (`i18n-parity.cjs`, `i18n-lint.cjs`).
