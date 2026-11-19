# M2 — Tasa de IVA configurable por producto

**Status**: APPROVED — 2026-11-19 (PR #110, no fusionado). Construido y probado contra MySQL real (e2e con tasas null/5/0, migración arriba/abajo/arriba); Playwright solo en CI, sin verificar en staging. Abierto: revisar el log de la migración antes de desplegar (productos cuya tasa guardada difiere de la de su empresa), paso 2 (otros tipos de impuesto).

## 1. Problema
El IVA estaba fijo en 19 % en `OrderCalculationService` y otra vez en la página de ventas del frontend. `products.tax_rate` y `settings.taxRate` existían pero ninguna venta los leía.

## 2. Decisión (propietario, 2026-11-19)
- La tasa vive **por producto**; si el producto no la define (`null`), aplica la de la empresa (`settings.taxRate`). Mismo patrón que `allow_sale_without_stock`.
- La migración **no sobrescribe** valores guardados (el formulario y la importación del legado ya escribían tasas reales). Efecto: los productos cuya tasa guardada no es 19 pasan a venderse a esa tasa.
- Cada línea de pedido guarda la tasa aplicada (`order_items.tax_rate`).
- Otros tipos de impuesto (impuesto al consumo, bolsas) son un paso 2, fuera de este spec.
- El servidor decide la tasa; la que envíe el cliente se ignora.

## 3. Fuera de alcance
- `settings.taxIncludedInPrice` (hoy `true` por defecto, pero el cálculo trata los precios como sin IVA): desacuerdo previo, a decidir aparte.
- Catálogo de reglas tributarias (SPEC-FISC-007): las tasas son datos del propietario, no reglas citadas.
