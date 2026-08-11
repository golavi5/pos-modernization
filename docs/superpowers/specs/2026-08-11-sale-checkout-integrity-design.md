# Integridad del cierre de venta — Design Spec

**Issue:** POS-BACK-003
**Status:** Approved

- **Spec ID:** 2026-08-11-sale-checkout-integrity
- **Módulos:** M2 (BACK) principal, M3 (FRONT)
- **Cierra:** D6, D7 y D8 del dry-run del 2026-08-11

---

## Contexto

El dry-run sobre el despliegue de Coolify encontró que una venta completada por
la caja deja el sistema mal en las tres dimensiones que importan: el dinero, el
estado del pedido y el inventario. El detalle y las mediciones están en
`SPEC-BACK-003` §1; este documento es el diseño de la solución.

Tres decisiones de fondo, ya aprobadas:

1. Los `DECIMAL` se normalizan a `number` **en el backend**.
2. El cierre de venta son **dos llamadas**, y la segunda es la que cierra.
3. La ubicación de inventario se crea **bajo demanda**, no en el arranque.

---

## 1. Tipos numéricos en el límite de la API

### Qué

Un `ColumnNumericTransformer` en `src/common/column-numeric.transformer.ts`:

```ts
export const numericTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
```

Aplicado a **toda** columna `decimal`:

| Entidad | Columnas |
|---|---|
| `Product` | `price`, `cost`, `tax_rate` |
| `Order` | `subtotal`, `tax_amount`, `discount_amount`, `total_amount` |
| `OrderItem` | `unit_price`, `subtotal`, `tax_amount`, `discount`, `total` |
| `Payment` | `amount` |

### Por qué ahí

Es transformación de aplicación: **no hay migración**, el esquema no cambia.
Y corta la clase entera de bug en el origen — cualquier consumidor futuro (otro
cliente, un script, el móvil) recibe números sin tener que defenderse.

Con esto D7 se cierra **sin tocar el frontend**: `recalc` ya calculaba
`subtotal + tax − discount` correctamente; el fallo era que sumaba strings. Y el
`@Type(() => Number)` de `CreateOrderDto` pasa a ser redundancia defensiva en
vez de la única barrera.

### Riesgo

Algún consumidor podría depender del string (comparaciones `===`, formateo).
Los tests de la suite cubren productos, ventas y pagos; se ejecutan completos
antes de dar por bueno el cambio.

---

## 2. El cierre de venta

### Flujo

```
caja
 └─ POST /sales/orders                  → 201, pedido draft / unpaid
 └─ POST /sales/orders/:id/payments     → 201, pedido completed / paid
      └── TRANSACCIÓN
           ├─ inserta Payment
           ├─ recalcula payment_status (lógica ya existente)
           └─ si pasa a PAID y status !== completed:
                ├─ status = completed
                ├─ ensureDefaultLocation(company_id)
                ├─ por cada ítem: bloquea el producto, revalida stock,
                │                 descuenta stock_quantity
                └─ por cada ítem: inserta StockMovement(reference_id = order.id)
```

### La guarda es la transición, no el estado

El descuento cuelga de **pasar a** `completed`, no de *estar* `completed`. Un
segundo pago sobre el mismo pedido, o un reintento de la caja tras un timeout,
encuentra el pedido ya completado y no vuelve a descontar. Sin esa distinción,
un doble clic vacía el inventario.

### El stock se revalida dentro de la transacción

`createOrder` ya comprueba disponibilidad, pero entre crear el pedido y
cobrarlo puede haberse vendido la última unidad en otra caja. La revalidación va
con bloqueo pesimista sobre la fila del producto (`SELECT … FOR UPDATE` vía
`manager.findOne(Product, { lock: { mode: 'pessimistic_write' } })`), de modo que
dos cajas cobrando el mismo último ítem se serializan en vez de sobrevender.

### Frontend

En el `onConfirm` del panel de pago, tras `createSale`, encadenar
`paymentsApi.record(orderId, { payment_method, amount: total })`. El pedido sólo
se considera cerrado cuando la segunda llamada responde 201.

---

## 3. Ubicación de inventario bajo demanda

`InventoryLocationsService.ensureDefaultLocation(companyId, manager)`:

- Busca una `Warehouse` de la empresa; si no hay, crea `"Principal"`.
- Busca una `WarehouseLocation` en ella; si no hay, crea `"General"`.
- Devuelve el `location_id`.

Se invoca **dentro** de la transacción del descuento, con el mismo
`EntityManager`, y es idempotente.

**Por qué no en el arranque:** `ensureSystemRoles()` puede correr al boot porque
los roles son globales. Las empresas se crean en caliente (`POST /companies`),
así que un bootstrap de boot dejaría sin ubicación a toda empresa creada
después — y el fallo aparecería en la primera venta de esa empresa, no al
desplegar.

---

## 4. Errores y bordes

| Caso | Comportamiento |
|---|---|
| Falla la 2ª llamada (red, timeout) | El pedido queda `draft`/`unpaid`. Es un estado real —pedido pendiente de cobro— y la caja puede reintentar contra el mismo pedido. |
| Reintento tras timeout que sí llegó | Se registra un 2º pago; el pedido ya está `completed`, así que **no** se vuelve a descontar stock. El sobrepago queda visible en `payments` para que alguien lo resuelva. |
| Sin stock al cobrar | La transacción revierte entera: ni pago, ni cambio de estado, ni descuento. No se cobra lo que no se puede entregar. |
| Pago parcial | `payment_status = partially_paid`, `status` sigue `draft`, **no** se descuenta stock. El descuento espera al pago completo. |

---

## 5. Pruebas

Unitarias, con **verificación por mutación** en cada una — revertir el arreglo y
comprobar que el test se pone rojo, como se hizo con D1 y D5. Un test que pasa
contra el código viejo no protege nada.

| Qué | Aserción |
|---|---|
| Transformer | `GET /products` devuelve `price` como `number`; `typeof` en el test, no igualdad laxa |
| Totales | `total = subtotal + tax − discount` con precios que vienen como string del repositorio |
| Pago completo | crea `Payment`, `payment_status = paid`, `status = completed`, stock descontado, `StockMovement` con `reference_id` |
| Pago parcial | **no** descuenta, `status` sigue `draft` |
| Segundo pago | **no** vuelve a descontar |
| Sin stock | revierte: 0 pagos, stock intacto, `status` sin cambio |
| `ensureDefaultLocation` | crea bodega+ubicación la 1ª vez, reutiliza la 2ª |

Cierre: `STAGING-DRY-RUN.md` §4 completo (items 1–5) en navegador real, que es
lo que `SPEC-CUT-002` exige para levantar el NO-GO.

---

## 6. Fuera de alcance

- **"Mixed"** — varios pagos por pedido. El endpoint lo soporta; la UI no. Se
  **oculta el botón** hasta implementarlo: dejarlo mandando un pago único
  mentiría sobre lo que hizo.
- **D3** — el formulario de productos (`company_id`/`created_by` obligatorios,
  regex de SKU sin guiones). Bloquea §4-2 por UI; item aparte.
- El módulo de bodegas. Aquí sólo la ubicación por defecto que el FK exige.
