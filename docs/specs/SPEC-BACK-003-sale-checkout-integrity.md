# M2 — Integridad del cierre de venta (pago, totales e inventario)

**Status**: APPROVED — 2026-08-11. Diseño aprobado, sin implementar. Cierra D6, D7 y D8 del dry-run del 2026-08-11 ([acta](../../new-implementation/STAGING-DRY-RUN-RESULTS.md#addendum-2026-08-11-2-pasada-commit-97695db4)), los tres bloqueantes que impiden dar GO a `SPEC-CUT-002`.

**Owner**: gandhi
**Created**: 2026-08-11
**Modules**: M2 BACK (primary), M3 FRONT
**Plane**: mapea a M2 por el `default` de `_modules.yml`

---

## 1. Problema

Una venta completada desde la caja deja el sistema en un estado incorrecto en
las tres dimensiones que le importan a un POS. Medido contra el despliegue real
(pedido `ORD2026081100002`):

| | La caja mostró | El sistema registró |
|---|---|---|
| Total | `$ 25.000` | `total_amount = 29750.00` |
| Estado | venta completada | `status = draft` |
| Pago | tarjeta confirmada | `payment_status = unpaid`, 0 filas en `payments` |
| Stock | — | 50 → 50, `stock_movements` vacía |

- **D7** — se cobra $4.750 menos de lo que se registra, en cada venta.
- **D6** — el método de pago se descarta y la venta nace `draft`/`unpaid`.
- **D8** — la venta no descuenta inventario.

## 2. Causa raíz

**D7 no es un error de fórmula.** `recalc` en `app/(panel)/sales/page.tsx`
calcula `subtotal + tax - discount`, que es correcto. El fallo es de tipos:
MySQL entrega `DECIMAL` como string, así que `product.price` llega como
`"25000.00"` y `items.reduce((s, i) => s + i.subtotal, 0)` **concatena** en vez
de sumar. Reproducido:

```
subtotal = "025000.00"    ← concatenación
tax      = 4750           ← `*` sí coacciona, por eso el IVA salía bien
total    = 25000.00475    ← se muestra $ 25.000
```

Los tres números coinciden exactamente con lo observado en la caja. Es la misma
causa que D5 (`unit_price` rechazado por llegar como string).

**D6 y D8** comparten origen distinto: `createOrder` fija `status = DRAFT` a
fuego y nadie lo mueve; `CreateOrderDto` no declara `payment_method`, así que el
`ValidationPipe` global (`whitelist: true`) lo elimina antes del servicio; y
`createOrder` valida que haya stock suficiente pero no lo ajusta.

## 3. Decisiones tomadas

1. **Los `DECIMAL` se normalizan a `number` en el backend**, con un
   `ColumnNumericTransformer` en las entidades. Corta la clase entera de bug en
   el origen, en vez de parchear cada consumidor.
2. **El cierre de venta son dos llamadas**: `POST /sales/orders` deja el pedido
   `draft`, y `POST /sales/orders/:id/payments` —que ya existe y ya actualiza
   `payment_status`— lo cierra. Aprovecha lo construido y admite varios pagos
   por pedido.
3. **La ubicación de inventario se crea bajo demanda**, no en el arranque: las
   empresas se crean en caliente y un bootstrap de boot dejaría fuera a las
   nuevas.

## 4. Acceptance

- [ ] Un `GET /products` devuelve `price` como número, no como string.
- [ ] La caja muestra `Total = subtotal + IVA − descuento`, y ese número es el
      que se cobra y el que persiste el backend.
- [ ] Al confirmar el pago: `payments` tiene su fila, `payment_status = paid`,
      `status = completed`.
- [ ] El stock del producto baja por la cantidad vendida y queda una fila en
      `stock_movements` por ítem, con `reference_id` al pedido.
- [ ] Un segundo pago sobre el mismo pedido **no** vuelve a descontar stock.
- [ ] Sin stock suficiente al pagar, la transacción revierte y el pedido queda
      pendiente de cobro.
- [ ] `STAGING-DRY-RUN.md` §4 completo (items 1–5) en navegador real.

## 5. Fuera de alcance

- El botón **"Mixed"** de la caja (varios pagos por pedido). El endpoint lo
  soporta; la UI no. Se oculta hasta implementarlo.
- **D3** — el formulario de productos no puede crear nada (`company_id` y
  `created_by` obligatorios en el DTO, regex de SKU que rechaza guiones).
  Bloquea §4-2 por UI; va en su propio item.
- El módulo de bodegas como tal. Aquí sólo se crea la ubicación por defecto que
  `stock_movements` exige.

## 6. Referencias

- Diseño: [`docs/superpowers/specs/2026-08-11-sale-checkout-integrity-design.md`](../superpowers/specs/2026-08-11-sale-checkout-integrity-design.md)
- Acta del dry-run: [`STAGING-DRY-RUN-RESULTS.md`](../../new-implementation/STAGING-DRY-RUN-RESULTS.md)
- `SPEC-CUT-002` — bloqueada por estos tres defectos.
