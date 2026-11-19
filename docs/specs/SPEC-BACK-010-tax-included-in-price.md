# M2 — IVA incluido o no en el precio (por empresa)

**Status**: DRAFT — 2026-11-19. En construcción.

## 1. Problema
`settings.taxIncludedInPrice` (por defecto `true`, mostrado en Ajustes como "IVA incluido en precio") se guardaba pero ningún código lo leía: la venta siempre sumaba el IVA encima del precio. El sistema legado trata `ValorUnit` como IVA incluido y la migración M4 copia `Precio` sin tocarlo (el propietario confirmó que los precios legados incluyen IVA), así que un catálogo migrado se cobraría con IVA doble.

## 2. Decisión (propietario, 2026-11-19)
- El ajuste pasa a mandar el cálculo de la venta, por empresa. Por defecto: incluido.
- No hay inquilinos reales todavía (solo datos de desarrollo y pruebas): no se migra el valor del ajuste.
- **Pesos enteros en los dos modos**, porque el documento fiscal exige `subtotal + IVA = total` sin centavos (DIAN, regla FAU06; los importes se truncan al enviar).

| Modo | Total de la línea | Subtotal | IVA |
|---|---|---|---|
| Incluido | `round(cantidad × precio)` | `round(total / (1 + tasa))` | `total − subtotal` |
| No incluido | `subtotal + IVA` | `round(cantidad × precio)` | `round(subtotal × tasa)` |

Con tasa 0 el IVA es 0 en ambos. Redondeo: mitad hacia arriba (el legado usa el redondeo bancario de C#; solo difieren en exactamente .5). El descuento a nivel de pedido sigue restándose del total del pedido, como hasta ahora.
- La respuesta de productos incluye `price_includes_tax` (resuelto en el servidor, igual que `effective_tax_rate`: el cajero no puede leer `/settings`).
- El documento fiscal envía como `price_amount` el precio unitario **neto** (`subtotal / cantidad`), de modo que precio × cantidad = subtotal de la línea, la forma que el sandbox de Plemsi validó.

## 3. Límites
- El redondeo a pesos enteros supone COP; el ajuste `currency` existe pero el alcance fiscal es colombiano.
- Un pedido con descuento a nivel de pedido sigue sin mapearse a documento fiscal.
- Otros tipos de impuesto (consumo, bolsas): paso 2 de SPEC-BACK-009.
