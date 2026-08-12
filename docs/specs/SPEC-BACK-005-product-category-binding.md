# M2 — La categoría del formulario de producto se descarta en silencio

**Status**: DRAFT — 2026-08-11. Detectado mientras se diseñaba `SPEC-BACK-004`; separado a ítem propio porque arreglarlo exige un selector de categorías, no un ajuste del DTO. Nada implementado.

**Owner**: gandhi
**Created**: 2026-08-11
**Modules**: M2 BACK (primary), M3 FRONT
**Plane**: mapea a M2 por el `default` de `_modules.yml`

---

## 1. Problema

Se puede crear un producto desde la UI, elegirle una categoría, y **la categoría
desaparece sin que nada avise**. No hay error, no hay 400, no hay mensaje: el
producto se guarda sin categoría y el operador cree que la tiene.

## 2. Causa

Tres piezas que no encajan, y ningún guardia entre ellas:

| Pieza | Qué es |
|---|---|
| `frontend/components/products/ProductFormFields.tsx` | un `<Input type="text">` libre llamado `category`, con placeholder |
| `frontend/types/product.ts` | `CreateProductDto` declara `category?: string` **y** `category_id?: string` |
| `backend/.../dto/create-product.dto.ts` | solo declara `category_id?: string` con `@IsUUID()` |

`main.ts:56` usa `ValidationPipe({ whitelist: true })` **sin
`forbidNonWhitelisted`**. Como `category` no lleva decoradores en el DTO del
backend, el pipe la **borra del objeto en sitio y no reporta nada**. El fallo es
silencioso por diseño del pipe, no por accidente.

Que el backend sí tiene categorías se ve en `productsApi.listCategories()`
(`GET /products/categories`) y en `Product.category_id`: la entidad las soporta,
el formulario nunca las usa.

## 3. Por qué no se arregló en BACK-004

Porque no es el mismo arreglo. `SPEC-BACK-004` reescribe el DTO para que acepte
lo que el formulario manda; esto exige lo contrario — cambiar lo que el
formulario manda, sustituyendo el campo de texto libre por un selector cargado
de `GET /products/categories`. Meterlo allí habría mezclado dos cambios de forma
distinta en el mismo diff.

**Riesgo de que se tape:** la verificación de D3 en `SPEC-BACK-004` pasa en verde
con este defecto vivo. Si nadie lo mira aparte, reaparece más tarde como
regresión.

## 4. Acceptance

- [ ] El formulario ofrece las categorías existentes de la empresa, no texto
      libre, y manda `category_id`.
- [ ] Un producto creado con categoría la conserva: se ve en la lista y al
      reabrir el formulario.
- [ ] Editar un producto preselecciona su categoría actual.
- [ ] Se decide y se documenta qué pasa sin categorías dadas de alta: o el
      selector permite crear una al vuelo, o queda vacío con un texto que lo
      explique. Una de las dos, no ninguna.
- [ ] `types/product.ts` deja de declarar `category` y `category_id` a la vez.

## 5. Decisión pendiente (no asumir)

¿El selector permite **crear una categoría al vuelo** desde el formulario de
producto, o obliga a darlas de alta antes en `CategoryManager`? Afecta al
alcance: la primera opción toca también el backend de categorías.

## 6. Fuera de alcance

Los otros campos que el formulario manda y el backend descarta por la misma vía
(`min_stock_level`, `max_stock_level`, `unit_of_measure`): no existen como
columna en `products`, así que descartarlos es correcto — lo que sobra es que el
formulario los pida. Es cosmética, no pérdida de datos, y va aparte.
