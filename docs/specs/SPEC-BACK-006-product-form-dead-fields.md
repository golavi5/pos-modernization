# M2 — El formulario de producto pide campos que el backend no guarda

**Status**: DONE — 2026-11-09 (PR #60). Campos fuera del formulario, de los tipos y de la tabla; claves i18n sin uso eliminadas. Verificado en navegador: el formulario ya no muestra stock mínimo/máximo ni unidad de medida ([registro](../verification/2026-11-09-back-004-005-006.md), check 1).

**Owner**: gandhi
**Created**: 2026-11-09
**Modules**: M3 FRONT (primary), M2 BACK (sin cambios)
**Plane**: mapea a M2 por el `default` de `_modules.yml`

---

## 1. Problema

`ProductFormFields.tsx` pide `min_stock_level`, `max_stock_level` y
`unit_of_measure`. La tabla `products` no tiene esas columnas (solo
`reorder_level`), y el `ValidationPipe({ whitelist: true })` las descarta sin
avisar. El operador llena campos que no se guardan. No hay pérdida de datos
reales: lo que sobra es el campo.

## 2. Alcance

- Quitar los tres campos de `ProductFormFields.tsx` y de `ProductForm.tsx`.
- Quitar los tres de `Product`, `CreateProductDto` y `UpdateProductDto` en
  `types/product.ts`.
- `ProductsTable.tsx` los leía también (insignia de stock bajo y unidad): esas
  lecturas nunca se cumplían; se eliminan.
- Quitar las claves i18n que quedan sin uso, en `es.json` y `en.json`.

## 3. Fuera de alcance

- Añadir las columnas al backend (migración): no hay decisión de producto que
  pida min/max/unidad por producto.
- Una insignia de stock bajo en la tabla basada en `reorder_level` (la usan
  `ProductCard`/`ProductList`): cambia comportamiento visible, va aparte.
- Los `min_stock_level`/`max_stock_level` del módulo de inventario
  (`types/inventory.ts`, `StockTable`): son otra fuente de datos.

## 4. Acceptance

- [ ] El formulario de producto no muestra min/max/unidad de medida.
- [ ] `types/product.ts` no declara los tres campos.
- [ ] `tsc`, `lint` y los dos checks i18n pasan; crear y editar un producto
      sigue funcionando.
