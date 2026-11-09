# M2 — Un solo libro de inventario (cierra BACK-003 (c) y el resto de (d))

**Status**: DRAFT — 2026-11-09. Diseño propuesto; nada implementado. No se puede empezar el slice 1 sin respuesta a la pregunta abierta 1.

## 1. Problema

Hay dos libros que divergen (hechos verificados en código el 2026-11-09):

| | Libro A: `products.stock_quantity` | Libro B: `warehouse_locations.current_stock` + `stock_movements` |
|---|---|---|
| Lo leen | POS, páginas de productos, reportes de bajo stock, campana de notificaciones | página `/inventory` (alcanzable desde la barra lateral) |
| Lo escribe | cobro, confirmación, formulario de producto, migración legada | solo `StockService.adjustStock`, que **rechaza toda operación**: la ubicación nace con `capacity: 0` (`stock.service.ts:110`) |
| Rastro en `stock_movements` | cobro y reembolso sí; **confirmación no** (`products.service.ts:204-210`), edición de producto no | — |

Consecuencias: tras una venta el POS muestra un stock y `/inventory` otro (`current_stock` sigue en 0); una venta por `confirmed` no deja rastro, así que `refundPayment` no puede devolverla; `CONFIRMED → VOIDED` no restituye stock; y `updateOrderStatus` descuenta en un bucle sin transacción ni bloqueo (dos confirmaciones simultáneas descuentan dos veces — misma clase de fallo que el reembolso de #68).

## 2. Decisión propuesta

**`products.stock_quantity` es la fuente de verdad. `stock_movements` es su diario de deltas.** Razones: todo lo que el cajero y los reportes ven ya lee el libro A; la migración legada solo llena el libro A (incluidas las 7.809 filas negativas que la sobreventa exige conservar); y el único escritor del libro B no funciona.

Invariantes:
- **Diario:** desde el corte, todo cambio de `stock_quantity` escribe **exactamente una** fila de `stock_movements` en la misma transacción, bajo bloqueo de la fila del producto. Es un diario, no una fuente de la que derivar el stock: los productos migrados no tienen saldo inicial, así que `Σ movimientos ≠ stock`. No se añaden filas de apertura (tocar `migration/src/rules/` invalida el parity de MIGR-001).
- **Signo:** `quantity` siempre positiva; el tipo lleva la dirección (`IN`/`RETURN` suben; `OUT`/`ADJUST`/`DAMAGE` bajan). Sin valores nuevos de enum (precedente BACK-004). Hoy `ADJUST` solo resta, así que no se puede registrar una corrección al alza: `ADJUST` queda como corrección a la baja y la subida es `IN`.
- **Negativo:** solo la venta lleva el stock por debajo de 0. Un decremento manual no puede cruzar 0.
- **Criterio de aceptación de cada slice:** en el test, por cada producto tocado, `Δ stock_quantity` = suma con signo de los movimientos creados.

## 3. Escritores del libro A

| Escritor | Destino |
|---|---|
| `deductStock` (vía `CONFIRMED`) | escribe `OUT`; pedido bloqueado y en transacción (slice 1) |
| `CONFIRMED → VOIDED` / `CANCELLED` | `VOIDED` desde `CONFIRMED` escribe `RETURN`; hoy deja el stock descontado |
| `recordPayment`, `refundPayment` | sin cambios (ya escriben diario; #64, #68) |
| `StockService.adjustStock` | bloquea el producto, aplica el delta a `products`, inserta el movimiento; sin capacidad ni `current_stock` |
| `addStock`, `MovementService.recordMovement` | **borrar**: sin llamadores (grep); `recordMovement` escribiría diario sin mover stock |
| alta/edición de producto | ver pregunta 2 |
| migración legada | sin cambios |

Los pedidos confirmados **antes** del corte no tienen rastro: el respaldo actual de `refundPayment` (sin movimientos → vuelve a `CONFIRMED`, no toca stock) se conserva para ellos.

## 4. Lectores

- `GET /inventory/stock` y `/stock/:product_id` pasan a leer `products` (por producto, no por ubicación). **Cambia la forma de la respuesta**, así que `/inventory` cambia en el mismo slice.
- Borrar `StockCalculatorService` (deriva stock desde movimientos y recorta a 0: contradice el diario y la sobreventa) y `ReorderAlertService` (sin UI, devuelve `location.id` como `product_id`; el scheduler de notificaciones ya lee `products`).
- La página `/inventory` hoy no cuadra con el backend: espera `{data}` paginado y el backend devuelve un arreglo (`StockTable.tsx:29`); manda `reference_number`/`warehouse_id` y el DTO solo conoce `reference_id` (`inventory/page.tsx:41,45`, `adjust-stock.dto.ts:20`); llama a `/inventory/stats`, ruta que no existe en el controlador.

## 5. Slices (cada uno con su test)

1. **Confirmación íntegra.** Transacción + bloqueo del pedido (patrón de `recordPayment`), `OUT` por ítem, `RETURN` al anular. Test: carrera de dos confirmaciones y anulación en `payments-lock.e2e-spec.ts` (ya corre en CI desde #69). Cierra (d).
2. **Inventario sobre el libro A.** `adjustStock`, lectores, borrados de §3/§4 y la página `/inventory` en un solo cambio. Test: ajuste real contra MySQL con el invariante de §2.
3. **Formulario de producto** según la pregunta 2.

Fuera de alcance (slices posteriores): quitar las columnas `current_stock`/`capacity` (migración), el reporte `value-by-warehouse` con ceros fijos, la columna duplicada `locationId`.

## 6. Preguntas abiertas (decide Gandhi)

1. **¿El sistema legado lleva stock por bodega?** Esta decisión asume que no (la migración solo mapea `CantFisica` por producto, y la sobreventa del legado es por producto), pero `info/bd_ex.sql` no está en este checkout y ningún doc lo afirma. *Por defecto: no → un solo libro.* Si la respuesta es sí, la fuente de verdad pasa a ser por ubicación y este diseño se rehace.
2. **¿Se edita el stock desde el formulario de producto?** *Por defecto: no.* El alta con stock inicial escribe un `IN`; en edición el campo es solo lectura y los cambios van por ajuste de inventario (deja diario y hace imposible por construcción el caso de #67). Alternativa: la edición escribe una fila por el delta.
3. **¿Puede un decremento manual cruzar 0?** *Por defecto: no.*
