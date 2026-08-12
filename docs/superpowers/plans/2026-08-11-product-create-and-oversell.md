# Alta de producto (D3) y venta sin existencias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un producto se pueda dar de alta desde el formulario de la UI, y que un producto se pueda vender sin existencias según una bandera por producto que hereda de un ajuste global.

**Architecture:** El `CreateProductDto` deja de pedir lo que sale del JWT y deja de rechazar lo que el formulario manda de verdad. La venta sin existencias se decide con una función pura, `canSellWithoutStock(producto, política) = producto.allow_sale_without_stock ?? settings.allowNegativeStock`, consumida por los tres puntos de validación del libro de productos. El frontend no resuelve nada: la API de productos devuelve el booleano ya resuelto, porque un cajero no puede leer `GET /settings`.

**Tech Stack:** NestJS 10, TypeORM (MySQL 8), class-validator / class-transformer, Jest. Next.js 14 App Router, TanStack Query v5, next-intl. CLI de migración M4 con Testcontainers.

**Diseño aprobado:** `docs/superpowers/specs/2026-08-11-product-create-and-oversell-design.md`
**Spec:** `docs/specs/SPEC-BACK-004-product-create-dto.md`
**Rama:** `back-004-product-create-and-oversell` (ya creada, con el commit del diseño)

## Global Constraints

- **Verificación por mutación obligatoria en cada tarea.** Después de que un test pase: revierte el arreglo, corre el test, comprueba que se pone **rojo**, restaura el arreglo y cita el fallo en el commit o en el reporte. Un test que sigue verde con el arreglo revertido no prueba nada.
- **No trabajes en un worktree.** `backend/node_modules` está trackeado en git e incompleto; un worktree no puede correr la suite. Todo en el árbol principal, en la rama `back-004-product-create-and-oversell`.
- **Los tests que usan decoradores de class-transformer necesitan `import 'reflect-metadata';` en la PRIMERA línea del fichero.**
- **`npm run lint` MUTA ficheros** (`eslint --fix`). Para comprobar sin mutar: `npm run lint:ci`.
- **Presupuesto de `any`:** `npm run lint:budget` limita `any` a 117 de 146 ficheros del backend. No introduzcas `any` nuevos en ficheros que hoy no lo tengan.
- **i18n:** toda cadena visible va en `messages/es.json` **y** `messages/en.json`, con paridad. Comprobación: `node scripts/smoke/i18n-parity.cjs && node scripts/smoke/i18n-lint.cjs` desde `frontend/`.
- **No dispares despliegues.** Los redespliegues en Coolify los hace Gandhi; pídeselos.
- **Nunca edites `new-implementation/database/schema.sql`.** El esquema lo poseen las migraciones de TypeORM.
- **Convención de commits:** `feat(...)`, `fix(...)`, `test(...)`, `docs(...)`. Sin `Closes POS-BACK-004` en los commits — esa keyword va **una sola vez**, en el cuerpo del PR final (Tarea 12).

## Estructura de ficheros

**Backend — se crean:**
- `src/modules/products/can-sell-without-stock.ts` — la regla pura y sus tipos. Sin dependencias de Nest ni de TypeORM.
- `src/modules/products/tests/create-product.dto.spec.ts` — validación del DTO contra el payload real del formulario.
- `src/modules/products/tests/can-sell-without-stock.spec.ts` — tabla de verdad de la regla.
- `src/database/migrations/1781700000000-AddOversellFlags.ts`

**Backend — se modifican:**
- `src/modules/products/dto/create-product.dto.ts` (T1)
- `src/modules/products/dto/update-product.dto.ts`, `dto/product-response.dto.ts` (T3, T4)
- `src/modules/products/entities/product.entity.ts` (T3)
- `src/modules/products/products.service.ts` (T2, T4, T7), `products.module.ts` (T4)
- `src/modules/settings/entities/settings.entity.ts` (T3)
- `src/modules/sales/services/sales.service.ts` (T5), `services/payments.service.ts` (T6), `sales.module.ts` (T6)
- Tests existentes: `products/tests/products.service.spec.ts`, `sales/tests/sales.service.spec.ts`, `sales/tests/payments-checkout.service.spec.ts`

**Frontend — se modifican:**
- `types/product.ts` (T8)
- `app/(panel)/sales/page.tsx`, `components/sales/ProductSearch.tsx`, `components/sales/SalesCart.tsx` (T8)
- `components/products/ProductForm.tsx`, `components/products/ProductFormFields.tsx` (T9)
- `messages/es.json`, `messages/en.json` (T8, T9)

**Migración M4 — se modifica:**
- `migration/src/rules/products.rule.ts` (T10)

---

### Task 1: `CreateProductDto` acepta lo que el formulario manda

**Files:**
- Modify: `new-implementation/backend/src/modules/products/dto/create-product.dto.ts`
- Test: `new-implementation/backend/src/modules/products/tests/create-product.dto.spec.ts` (crear)

**Interfaces:**
- Consumes: nada.
- Produces: `CreateProductDto` sin `company_id` ni `created_by`, con `reorder_level?: number`, `allow_sale_without_stock?: boolean | null`, y `sku` normalizado a mayúsculas. La Tarea 2 depende de que `company_id` ya **no** exista en el DTO.

**Contexto:** el 400 que registró la spec es incompleto. Validando el DTO actual contra el payload real del formulario **con código de barras e imagen vacíos** (el caso normal) salen cinco propiedades en rojo, no tres: `sku`, `barcode`, `reorder_level`, `image_url`, `company_id`, `created_by`. `@IsOptional()` de class-validator solo ignora `null` y `undefined`, nunca `''`.

- [ ] **Step 1: Escribe el test que falla**

Crea `new-implementation/backend/src/modules/products/tests/create-product.dto.spec.ts`:

```ts
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateProductDto } from '../dto/create-product.dto';

/** Lo que `ProductForm.tsx` manda hoy tal cual, sin limpiar cadenas vacías. */
const uiPayload = () => ({
  name: 'Producto de prueba',
  description: '',
  sku: 'PRD-001',
  barcode: '',
  category: '',
  price: 1000,
  cost: 0,
  stock_quantity: 5,
  min_stock_level: 0,
  max_stock_level: 0,
  unit_of_measure: 'unidad',
  tax_rate: 19,
  image_url: '',
});

const validate = (payload: Record<string, unknown>) => {
  const dto = plainToInstance(CreateProductDto, payload);
  const errors = validateSync(dto, { whitelist: true });
  return { dto, props: errors.map((e) => e.property).sort() };
};

describe('CreateProductDto', () => {
  it('acepta el payload exacto del formulario de la UI', () => {
    const { props } = validate(uiPayload());
    expect(props).toEqual([]);
  });

  it('normaliza el SKU: recorta y pasa a mayúsculas', () => {
    const { dto, props } = validate({ ...uiPayload(), sku: '  prd-001  ' });
    expect(props).toEqual([]);
    expect(dto.sku).toBe('PRD-001');
  });

  it('acepta los SKU del catálogo legado, que son alfanuméricos puros', () => {
    expect(validate({ ...uiPayload(), sku: '1' }).props).toEqual([]);
    expect(validate({ ...uiPayload(), sku: 'ABC123' }).props).toEqual([]);
  });

  it('sigue rechazando un SKU con espacio interior', () => {
    expect(validate({ ...uiPayload(), sku: 'PRD 001' }).props).toEqual(['sku']);
  });

  it('convierte las cadenas vacías de los opcionales en undefined', () => {
    const { dto } = validate(uiPayload());
    expect(dto.barcode).toBeUndefined();
    expect(dto.image_url).toBeUndefined();
    expect(dto.description).toBeUndefined();
  });

  it('sigue validando barcode e image_url cuando SÍ traen valor', () => {
    expect(validate({ ...uiPayload(), image_url: 'no-es-una-url' }).props).toEqual(['image_url']);
    expect(validate({ ...uiPayload(), barcode: '7707358292295' }).props).toEqual([]);
  });

  it('reorder_level es opcional, y si viene se valida', () => {
    expect(validate(uiPayload()).props).toEqual([]);
    expect(validate({ ...uiPayload(), reorder_level: 5 }).props).toEqual([]);
    expect(validate({ ...uiPayload(), reorder_level: -1 }).props).toEqual(['reorder_level']);
  });

  it('ya no pide company_id ni created_by, y descarta los que le manden', () => {
    const { dto, props } = validate({
      ...uiPayload(),
      company_id: '11111111-1111-1111-1111-111111111111',
      created_by: '22222222-2222-2222-2222-222222222222',
    });
    expect(props).toEqual([]);
    expect((dto as Record<string, unknown>).company_id).toBeUndefined();
    expect((dto as Record<string, unknown>).created_by).toBeUndefined();
  });

  it('acepta allow_sale_without_stock en sus tres estados', () => {
    expect(validate({ ...uiPayload(), allow_sale_without_stock: true }).props).toEqual([]);
    expect(validate({ ...uiPayload(), allow_sale_without_stock: false }).props).toEqual([]);
    expect(validate({ ...uiPayload(), allow_sale_without_stock: null }).props).toEqual([]);
  });
});
```

> El último test está verificado contra el comportamiento real de class-validator, no supuesto: `validateSync(obj, { whitelist: true })` **borra del objeto, en sitio**, toda propiedad sin decoradores de validación, y solo reporta error en las que sí los tienen. Medido con el DTO actual: `bogus` desaparece, mientras `company_id` —que hoy lleva `@IsUUID()`— sobrevive y da error. Quitado del DTO se queda sin decoradores, así que pasa a descartarse. La aserción es correcta tal como está: **no la debilites**.

- [ ] **Step 2: Corre el test y comprueba que falla**

```bash
cd new-implementation/backend && npx jest --testPathPattern "create-product.dto"
```

Esperado: FAIL. El primero debe fallar con `props` conteniendo `barcode`, `company_id`, `created_by`, `image_url`, `reorder_level`, `sku`.

- [ ] **Step 3: Reescribe el DTO**

Reemplaza el contenido de `src/modules/products/dto/create-product.dto.ts`:

```ts
import { Transform } from 'class-transformer';
import {
  IsString, IsOptional, IsNumber, Min, Max, IsBoolean, IsUrl, IsUUID, Length, Matches,
} from 'class-validator';

/**
 * `@IsOptional()` de class-validator solo ignora `null` y `undefined`, nunca `''`.
 * El formulario de la UI inicializa `barcode` e `image_url` a cadena vacía y los
 * manda tal cual, así que sin esto un alta con esos campos en blanco —el caso
 * normal— devuelve 400. Se normaliza aquí, en el límite de la API, no en el
 * formulario: la API no debe rechazar `""` en un campo opcional venga de donde venga.
 */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateProductDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  description?: string;

  // El catálogo legado son 30.276 SKUs estrictamente [A-Z0-9], así que relajar
  // el patrón no invalida ninguno. Se relaja porque el placeholder del propio
  // campo en la UI es `PRD-001`, que el patrón viejo rechazaba.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(1, 100)
  @Matches(/^[A-Z0-9][A-Z0-9._-]*$/, {
    message: 'SKU must contain only letters, numbers, dots, dashes and underscores',
  })
  sku: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(1, 100)
  barcode?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsNumber()
  @Min(0)
  stock_quantity: number;

  // La columna es `default: 0` y el formulario no expone el campo.
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorder_level?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  tax_rate: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  // Tri-estado: `null` significa "heredar de settings.allowNegativeStock".
  // Ver `can-sell-without-stock.ts`.
  @IsOptional()
  @IsBoolean()
  allow_sale_without_stock?: boolean | null;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUrl()
  image_url?: string;
}
```

> `allow_sale_without_stock: null` pasa porque `@IsOptional()` sí ignora `null`.

- [ ] **Step 4: Corre el test y comprueba que pasa**

```bash
cd new-implementation/backend && npx jest --testPathPattern "create-product.dto"
```

Esperado: PASS, 9 tests.

- [ ] **Step 5: Verificación por mutación**

Una por una, revierte y comprueba que el test correspondiente se pone rojo; restaura después de cada una:

1. Quita el `@Transform` del `sku` → debe fallar *"normaliza el SKU"*.
2. Devuelve el patrón a `/^[A-Z0-9]+$/` → debe fallar *"acepta el payload exacto"*.
3. Quita `@Transform(emptyToUndefined)` de `barcode` → debe fallar *"acepta el payload exacto"* y *"convierte las cadenas vacías"*.
4. Devuelve `reorder_level` a obligatorio → debe fallar *"acepta el payload exacto"*.

Anota los cuatro fallos en el reporte de la tarea.

- [ ] **Step 6: Comprueba tipos y commitea**

```bash
cd new-implementation/backend && npx tsc --noEmit -p tsconfig.json
git add src/modules/products/dto/create-product.dto.ts src/modules/products/tests/create-product.dto.spec.ts
git commit -m "fix(products): el DTO de alta acepta lo que el formulario manda

company_id y created_by salen del JWT, no del cliente. reorder_level pasa a
opcional. El SKU se normaliza a mayusculas y admite guion/punto/guion bajo,
como promete el placeholder PRD-001 de la propia UI.

Ademas arregla dos blockers que la spec no listaba: @IsOptional solo ignora
null y undefined, no '', asi que barcode e image_url vacios —lo que el
formulario manda por defecto— devolvian 400."
```

---

### Task 2: `ProductsService.create` toma la empresa del JWT

**Files:**
- Modify: `new-implementation/backend/src/modules/products/products.service.ts:66-98`
- Test: `new-implementation/backend/src/modules/products/tests/products.service.spec.ts` (añadir un `describe`)

**Interfaces:**
- Consumes: `CreateProductDto` de la Tarea 1, ya sin `company_id`.
- Produces: `create(dto, user)` que persiste `company_id: user.company_id` y `created_by: user.id`.

**El punto que rompe si se hace mal:** hoy `company_id` llega a la fila por el spread del DTO. Al quitarlo del DTO, la columna NOT NULL se queda sin valor y **falla en el insert, no en compilación**.

**Cambio de criterio, ya aprobado:** la guarda `if (createProductDto.company_id !== user.company_id) throw new UnauthorizedException(...)` se **borra**. Con `whitelist: true` en `main.ts:56` el campo se descarta antes de llegar al servicio, así que la condición es inalcanzable. Su invariante se prueba de otra forma: un `company_id` ajeno en el body no crea producto en esa empresa.

- [ ] **Step 1: Escribe el test que falla**

Añade al final de `src/modules/products/tests/products.service.spec.ts`, dentro del `describe('ProductsService', ...)` de nivel superior:

```ts
  describe('create', () => {
    beforeEach(() => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockImplementation((d: any) => d as any);
      jest.spyOn(repository, 'save').mockImplementation(async (p: any) => p);
    });

    const dto = () => ({
      name: 'Café',
      sku: 'PRD-001',
      price: 1000,
      stock_quantity: 5,
      tax_rate: 19,
    }) as any;

    it('toma company_id y created_by del usuario del JWT', async () => {
      const created = await service.create(dto(), mockUser);

      expect(created.company_id).toBe('company-uuid');
      expect(created.created_by).toBe('user-uuid');
    });

    it('un company_id ajeno en el body no crea producto en esa empresa', async () => {
      // Escenario: el ValidationPipe no descartó el campo (pipe mal configurado,
      // o una llamada interna que se salta el pipe). El servicio no debe fiarse.
      const hostile = { ...dto(), company_id: 'otra-empresa' };

      const created = await service.create(hostile, mockUser);

      expect(created.company_id).toBe('company-uuid');
      expect(created.company_id).not.toBe('otra-empresa');
    });
  });
```

- [ ] **Step 2: Corre el test y comprueba que falla**

```bash
cd new-implementation/backend && npx jest --testPathPattern "products.service" -t "create"
```

Esperado: el primero FALLA (`created.company_id` es `undefined`, porque el DTO ya no lo trae) y el segundo FALLA con `UnauthorizedException: Cannot create product for another company`.

- [ ] **Step 3: Arregla el servicio**

En `src/modules/products/products.service.ts`, dentro de `create`, **borra** este bloque entero:

```ts
    // Ensure the company_id in the DTO matches the user's company_id
    if (createProductDto.company_id !== user.company_id) {
      throw new UnauthorizedException('Cannot create product for another company');
    }
```

y reemplaza la construcción de la entidad por:

```ts
    // `company_id` y `created_by` salen SIEMPRE del JWT, nunca del cliente, y se
    // asignan DESPUÉS del spread: si el body trae un `company_id` que el
    // ValidationPipe no descartó, aquí queda sobrescrito. Sin esta línea la
    // columna NOT NULL se quedaría sin valor y fallaría en el insert.
    const product = this.productRepository.create({
      ...createProductDto,
      company_id: user.company_id,
      created_by: user.id,
    });
```

Quita `UnauthorizedException` del `import` de `@nestjs/common` **solo si** ya no se usa en ningún otro punto del fichero (compruébalo con una búsqueda).

- [ ] **Step 4: Corre el test y comprueba que pasa**

```bash
cd new-implementation/backend && npx jest --testPathPattern "products.service"
```

Esperado: PASS, incluidos los tests que ya existían en el fichero. Si alguno de los previos esperaba el `UnauthorizedException`, **actualízalo** al invariante nuevo y déjalo anotado en el reporte — no lo borres sin más.

- [ ] **Step 5: Verificación por mutación**

Invierte el orden del spread (`{ company_id: user.company_id, ...createProductDto }`) y corre el test: *"un company_id ajeno…"* debe ponerse **rojo**. Restaura. Cita el fallo.

- [ ] **Step 6: Commitea**

```bash
cd new-implementation/backend && npx tsc --noEmit -p tsconfig.json
git add src/modules/products/products.service.ts src/modules/products/tests/products.service.spec.ts
git commit -m "fix(products): create toma la empresa del JWT, no del body

La guarda del 401 era inalcanzable: con whitelist:true el company_id del body
se descarta antes de llegar al servicio. Se sustituye por su invariante real,
que ademas es mas fuerte porque no depende de que el atacante mande el campo:
el producto nace en la empresa del JWT, se mande lo que se mande."
```

---

### Task 3: Esquema — columna por producto y default global

**Files:**
- Modify: `new-implementation/backend/src/modules/products/entities/product.entity.ts`
- Modify: `new-implementation/backend/src/modules/products/dto/update-product.dto.ts`
- Modify: `new-implementation/backend/src/modules/settings/entities/settings.entity.ts:81`
- Create: `new-implementation/backend/src/database/migrations/1781700000000-AddOversellFlags.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `Product.allow_sale_without_stock?: boolean | null` (columna `tinyint NULL`) y `Settings.allowNegativeStock` con default `false` coherente entre entidad, DDL y filas existentes. Las Tareas 4-7 dependen de ambos.

**Contexto:** hoy el DDL declara `allowNegativeStock tinyint NOT NULL DEFAULT 1` (`InitialSchema.ts:15`) mientras `settings.service.ts:44,130` crea las filas con `false`. El interruptor es inerte, así que su valor guardado no expresa intención del operador; en cuanto se cablee pasa a ser carga viva. Se unifica en `false` y se resetean las filas existentes.

- [ ] **Step 1: Añade la columna a la entidad `Product`**

En `src/modules/products/entities/product.entity.ts`, justo después de `reorder_level`:

```ts
  /**
   * Tri-estado. `null` = heredar de `settings.allowNegativeStock`.
   * El legado tiene el equivalente por producto (`inventarios.EsFactSinExistencia`):
   * 30.004 de 30.276 productos lo traen a 1 y los 272 restantes, activos, a 0.
   * Esa lista de excepciones viva es lo que justifica una columna por producto
   * y no solo un ajuste global.
   */
  @Column({ name: 'allow_sale_without_stock', type: 'boolean', nullable: true })
  @IsOptional()
  @IsBoolean()
  allow_sale_without_stock?: boolean | null;
```

`IsOptional` e `IsBoolean` ya están importados en el fichero.

- [ ] **Step 2: Añade el campo al DTO de actualización y al de respuesta**

En `src/modules/products/dto/update-product.dto.ts`, siguiendo el estilo del fichero:

```ts
  @IsOptional()
  @IsBoolean()
  allow_sale_without_stock?: boolean | null;
```

Importa `IsBoolean` si no está. En `src/modules/products/dto/product-response.dto.ts`, después de `is_active`:

```ts
  @Expose()
  @IsOptional()
  @IsBoolean()
  allow_sale_without_stock?: boolean | null;

  /** Resuelto por el backend: `allow_sale_without_stock ?? settings.allowNegativeStock`. */
  @Expose()
  @IsBoolean()
  can_sell_without_stock: boolean;
```

- [ ] **Step 3: Unifica el default de `allowNegativeStock`**

En `src/modules/settings/entities/settings.entity.ts`, línea 80-81:

```ts
  // Default `false`: encender la sobreventa global tiene que ser un acto
  // deliberado del operador. El catálogo legado no lo necesita — llega con la
  // bandera por producto puesta.
  @Column({ default: false })
  allowNegativeStock: boolean;
```

- [ ] **Step 4: Escribe la migración**

Crea `src/database/migrations/1781700000000-AddOversellFlags.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOversellFlags1781700000000 implements MigrationInterface {
  name = 'AddOversellFlags1781700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE `products` ADD COLUMN `allow_sale_without_stock` TINYINT(1) NULL',
    );

    // El DDL inicial dejó DEFAULT 1 mientras el servicio escribía `false`. Se
    // unifica en 0 y se resetean las filas existentes: hasta ahora el
    // interruptor no lo leía nadie, así que su valor guardado no expresa
    // ninguna intención, y a partir de esta migración pasa a ser carga viva.
    await q.query(
      'ALTER TABLE `settings` MODIFY COLUMN `allowNegativeStock` TINYINT NOT NULL DEFAULT 0',
    );
    await q.query('UPDATE `settings` SET `allowNegativeStock` = 0');
  }

  public async down(q: QueryRunner): Promise<void> {
    // El `down` restaura el ESQUEMA, no los valores de fila: el UPDATE de `up`
    // es irreversible y no hay dónde leer los valores previos.
    await q.query(
      'ALTER TABLE `settings` MODIFY COLUMN `allowNegativeStock` TINYINT NOT NULL DEFAULT 1',
    );
    await q.query(
      'ALTER TABLE `products` DROP COLUMN `allow_sale_without_stock`',
    );
  }
}
```

- [ ] **Step 5: Comprueba que compila y que la suite sigue verde**

```bash
cd new-implementation/backend && npx tsc --noEmit -p tsconfig.json && npm test
```

Esperado: compila, y los 278 tests siguen pasando. Si `settings.service.spec.ts` falla por el default, **es señal de que el cambio importa** — ajusta la expectativa del test al valor nuevo y anótalo.

- [ ] **Step 6: Commitea**

```bash
git add src/modules/products/entities/product.entity.ts src/modules/products/dto/update-product.dto.ts src/modules/products/dto/product-response.dto.ts src/modules/settings/entities/settings.entity.ts src/database/migrations/1781700000000-AddOversellFlags.ts
git commit -m "feat(products): columna allow_sale_without_stock y default global coherente

Tri-estado por producto (NULL = heredar). Unifica allowNegativeStock en false
entre entidad, DDL y filas existentes: el DDL decia DEFAULT 1 y el servicio
escribia false, y el interruptor pasa de inerte a carga viva."
```

---

### Task 4: La regla pura y el campo resuelto en la API de productos

**Files:**
- Create: `new-implementation/backend/src/modules/products/can-sell-without-stock.ts`
- Create: `new-implementation/backend/src/modules/products/tests/can-sell-without-stock.spec.ts`
- Modify: `new-implementation/backend/src/modules/products/products.service.ts`
- Modify: `new-implementation/backend/src/modules/products/products.module.ts`
- Modify: `new-implementation/backend/src/modules/products/products.controller.ts`
- Test: `new-implementation/backend/src/modules/products/tests/products.service.spec.ts`

**Interfaces:**
- Consumes: `Product.allow_sale_without_stock` (T3), `SettingsService.getSettings(companyId)` (ya existe, `SettingsModule` ya lo exporta).
- Produces, y de esto dependen las Tareas 5, 6, 7 y 8:
  - `export interface OversellPolicy { allowNegativeStock: boolean }`
  - `export interface OversellSubject { allow_sale_without_stock?: boolean | null }`
  - `export function canSellWithoutStock(product: OversellSubject, policy: OversellPolicy): boolean`
  - `ProductsService.getOversellPolicy(companyId: string): Promise<OversellPolicy>`
  - Las respuestas de `GET /products`, `GET /products/:id`, `POST /products` y `PUT /products/:id` incluyen `can_sell_without_stock: boolean`.

**Por qué el campo va resuelto desde el backend:** `GET /settings` es `@Roles('admin','manager')`, así que un cajero no puede leer `allowNegativeStock`. Resolver en el frontend obligaría a ampliar esos permisos y exponer a la caja la configuración de pagos, fidelización y empresa.

**Por qué `findOne` NO cambia de forma:** `SalesService.createOrder` y `ProductsService.deductStock` usan `findOne` y luego `save()` sobre lo que devuelve. Si `findOne` devolviera un objeto plano con una propiedad que no es columna, el `save` se volvería frágil. `findOne` sigue devolviendo la entidad; el campo resuelto se añade en un método aparte para el controlador.

- [ ] **Step 1: Escribe el test de la regla**

Crea `src/modules/products/tests/can-sell-without-stock.spec.ts`:

```ts
import { canSellWithoutStock } from '../can-sell-without-stock';

describe('canSellWithoutStock', () => {
  const globalOn = { allowNegativeStock: true };
  const globalOff = { allowNegativeStock: false };

  it('la bandera del producto manda sobre el global cuando dice true', () => {
    expect(canSellWithoutStock({ allow_sale_without_stock: true }, globalOff)).toBe(true);
  });

  it('la bandera del producto manda sobre el global cuando dice false', () => {
    // Este es el caso de los 272 productos legados con EsFactSinExistencia=0:
    // siguen bloqueados aunque el operador encienda el interruptor global.
    expect(canSellWithoutStock({ allow_sale_without_stock: false }, globalOn)).toBe(false);
  });

  it('null hereda del global', () => {
    expect(canSellWithoutStock({ allow_sale_without_stock: null }, globalOn)).toBe(true);
    expect(canSellWithoutStock({ allow_sale_without_stock: null }, globalOff)).toBe(false);
  });

  it('undefined hereda del global, igual que null', () => {
    expect(canSellWithoutStock({}, globalOn)).toBe(true);
    expect(canSellWithoutStock({}, globalOff)).toBe(false);
  });
});
```

- [ ] **Step 2: Corre el test y comprueba que falla**

```bash
cd new-implementation/backend && npx jest --testPathPattern "can-sell-without-stock"
```

Esperado: FAIL — `Cannot find module '../can-sell-without-stock'`.

- [ ] **Step 3: Escribe la regla**

Crea `src/modules/products/can-sell-without-stock.ts`:

```ts
/** El ajuste de empresa que actúa como defecto (`settings.allowNegativeStock`). */
export interface OversellPolicy {
  allowNegativeStock: boolean;
}

/** Lo mínimo que la regla necesita de un producto. */
export interface OversellSubject {
  allow_sale_without_stock?: boolean | null;
}

/**
 * ¿Se puede vender este producto sin existencias?
 *
 * La bandera del producto manda; `null`/`undefined` significan "heredar del
 * ajuste global". Reproduce la semántica del legado
 * (`inventarios.EsFactSinExistencia`), que es por producto, y deja que los 272
 * productos marcados como NO vendibles sin stock sigan bloqueados aunque el
 * interruptor global esté encendido.
 *
 * Función pura a propósito: la consumen tres puntos de validación distintos y
 * tres copias del `??` se habrían desincronizado.
 */
export function canSellWithoutStock(
  product: OversellSubject,
  policy: OversellPolicy,
): boolean {
  return product.allow_sale_without_stock ?? policy.allowNegativeStock;
}
```

- [ ] **Step 4: Corre el test y comprueba que pasa**

```bash
cd new-implementation/backend && npx jest --testPathPattern "can-sell-without-stock"
```

Esperado: PASS, 4 tests.

- [ ] **Step 5: Verificación por mutación**

Cambia `??` por `||` y corre el test: *"la bandera del producto manda … cuando dice false"* debe ponerse **rojo** (`false || true === true`). Restaura. Cita el fallo — es exactamente la diferencia entre el modelo aprobado y el modelo OR que se descartó.

- [ ] **Step 6: Escribe el test del campo resuelto en el servicio**

Añade a `src/modules/products/tests/products.service.spec.ts`. **Ojo:** el `TestingModule` del fichero hay que ampliarlo con el proveedor de `SettingsService`; hazlo en el `beforeEach` existente añadiendo al array `providers`:

```ts
        {
          provide: SettingsService,
          useValue: { getSettings: jest.fn(async () => ({ allowNegativeStock: false })) },
        },
```

con `import { SettingsService } from '../../settings/services/settings.service';` arriba, y captura la referencia después de `compile()`:

```ts
    settingsService = module.get<SettingsService>(SettingsService);
```

Luego, el `describe` nuevo:

```ts
  describe('can_sell_without_stock en las respuestas', () => {
    it('findAll resuelve la bandera de cada producto contra el global', async () => {
      jest.spyOn(settingsService, 'getSettings')
        .mockResolvedValue({ allowNegativeStock: true } as any);
      const products = [
        { id: '1', allow_sale_without_stock: null },
        { id: '2', allow_sale_without_stock: false },
        { id: '3', allow_sale_without_stock: true },
      ] as any[];
      jest.spyOn(repository, 'findAndCount').mockResolvedValue([products, 3]);

      const result = await service.findAll(mockUser, {
        offset: 0, limit: 10, sort: 'created_at', order: 'DESC',
      } as any);

      expect(result.data.map((p: any) => p.can_sell_without_stock)).toEqual([true, false, true]);
    });

    it('findOne sigue devolviendo la entidad, sin el campo resuelto', async () => {
      // Lo usan deductStock y SalesService.createOrder, que hacen save() con lo
      // que devuelve: no puede llevar propiedades que no son columna.
      const entity = { id: '1', company_id: 'company-uuid', allow_sale_without_stock: null } as any;
      jest.spyOn(repository, 'findOne').mockResolvedValue(entity);

      const found = await service.findOne('1', mockUser);

      expect(found).toBe(entity);
      expect('can_sell_without_stock' in found).toBe(false);
    });

    it('getOversellPolicy lee el ajuste de la empresa', async () => {
      jest.spyOn(settingsService, 'getSettings')
        .mockResolvedValue({ allowNegativeStock: true } as any);

      await expect(service.getOversellPolicy('company-uuid'))
        .resolves.toEqual({ allowNegativeStock: true });
    });
  });
```

- [ ] **Step 7: Corre el test y comprueba que falla**

```bash
cd new-implementation/backend && npx jest --testPathPattern "products.service"
```

Esperado: FAIL — `service.getOversellPolicy is not a function` y `can_sell_without_stock` `undefined`.

- [ ] **Step 8: Cablea el servicio, el módulo y el controlador**

En `products.service.ts`, importa y añade la dependencia:

```ts
import { SettingsService } from '../settings/services/settings.service';
import {
  canSellWithoutStock,
  OversellPolicy,
} from './can-sell-without-stock';
```

```ts
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private readonly settingsService: SettingsService,
  ) {}

  /** El ajuste de empresa que sirve de defecto a la bandera por producto. */
  async getOversellPolicy(companyId: string): Promise<OversellPolicy> {
    const settings = await this.settingsService.getSettings(companyId);
    return { allowNegativeStock: settings.allowNegativeStock };
  }

  /**
   * Añade la bandera YA RESUELTA a un producto de salida. Se resuelve en el
   * backend porque `GET /settings` es admin/manager: un cajero no puede leer el
   * ajuste global, así que la caja no puede resolverla por su cuenta.
   */
  private withOversellFlag(product: Product, policy: OversellPolicy) {
    return { ...product, can_sell_without_stock: canSellWithoutStock(product, policy) };
  }
```

En `findAll`, después de obtener `[products, total]`:

```ts
    const policy = await this.getOversellPolicy(user.company_id);

    return {
      data: products.map((p) => this.withOversellFlag(p, policy)),
      meta: { total, offset, limit, hasMore: total > offset + limit },
    };
```

Añade el método que usará el controlador, dejando `findOne` intacto:

```ts
  /** `findOne` para la API: la entidad más la bandera resuelta. */
  async findOneForApi(id: string, user: User) {
    const product = await this.findOne(id, user);
    return this.withOversellFlag(product, await this.getOversellPolicy(user.company_id));
  }
```

En `create` y `update`, envuelve el valor devuelto:

```ts
    const saved = await this.productRepository.save(product);
    return this.withOversellFlag(saved, await this.getOversellPolicy(user.company_id));
```

En `products.module.ts`, añade `SettingsModule` a `imports` (`import { SettingsModule } from '../settings/settings.module';`). En `products.controller.ts`, el handler `findOne` pasa a llamar `this.productsService.findOneForApi(id, user)`.

- [ ] **Step 9: Corre los tests y comprueba que pasan**

```bash
cd new-implementation/backend && npm test
```

Esperado: toda la suite en verde. Si algún test de `sales.service.spec.ts` o del controlador rompe por el constructor nuevo de `ProductsService`, añade el proveedor mock de `SettingsService` allí también.

- [ ] **Step 10: Verificación por mutación**

Cambia `withOversellFlag` para que devuelva siempre `can_sell_without_stock: false`: *"findAll resuelve la bandera de cada producto"* debe ponerse **rojo**. Restaura. Cita el fallo.

- [ ] **Step 11: Commitea**

```bash
cd new-implementation/backend && npx tsc --noEmit -p tsconfig.json && npm run lint:ci && npm run lint:budget
git add src/modules/products src/modules/settings
git commit -m "feat(products): regla canSellWithoutStock y campo resuelto en la API

La regla vive en una funcion pura consumida por los tres puntos de validacion,
no en tres copias del ??. La API devuelve can_sell_without_stock ya resuelto
porque GET /settings es admin/manager y un cajero no puede leer el global."
```

---

### Task 5: `SalesService.createOrder` respeta la bandera

**Files:**
- Modify: `new-implementation/backend/src/modules/sales/services/sales.service.ts:113`
- Test: `new-implementation/backend/src/modules/sales/tests/sales.service.spec.ts`

**Interfaces:**
- Consumes: `ProductsService.getOversellPolicy(companyId)` y `canSellWithoutStock` (T4).
- Produces: nada nuevo.

`SalesService` ya inyecta `ProductsService`, así que no hace falta tocar `sales.module.ts`.

- [ ] **Step 1: Escribe el test que falla**

Añade a `src/modules/sales/tests/sales.service.spec.ts`. Amplía primero el mock de `ProductsService` del `beforeEach` con `getOversellPolicy: jest.fn(async () => ({ allowNegativeStock: false }))`. Luego:

```ts
  describe('createOrder — venta sin existencias', () => {
    const dto = {
      items: [{ product_id: 'p1', quantity: 3, unit_price: 1000, tax_rate: 19 }],
    } as any;

    const productWith = (flag: boolean | null) => ({
      id: 'p1', name: 'Café', company_id: 1, stock_quantity: 0,
      price: 1000, tax_rate: 19, allow_sale_without_stock: flag,
    }) as any;

    beforeEach(() => {
      jest.spyOn(orderRepository, 'save').mockImplementation(async (o: any) => ({ ...o, id: 'o1' }));
      jest.spyOn(orderItemRepository, 'save').mockImplementation(async (i: any) => i);
      jest.spyOn(service, 'getOrderById').mockResolvedValue({ id: 'o1' } as any);
      jest.spyOn(orderRepository, 'findAndCount').mockResolvedValue([[], 0]);
    });

    it('rechaza si el producto no puede venderse sin existencias', async () => {
      jest.spyOn(productsService, 'findOne').mockResolvedValue(productWith(false));

      await expect(service.createOrder(dto, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('acepta si la bandera del producto lo permite, con el global apagado', async () => {
      jest.spyOn(productsService, 'findOne').mockResolvedValue(productWith(true));

      await expect(service.createOrder(dto, mockUser)).resolves.toBeDefined();
    });

    it('con la bandera en null, hereda del global encendido', async () => {
      jest.spyOn(productsService, 'findOne').mockResolvedValue(productWith(null));
      jest.spyOn(productsService, 'getOversellPolicy')
        .mockResolvedValue({ allowNegativeStock: true });

      await expect(service.createOrder(dto, mockUser)).resolves.toBeDefined();
    });

    it('un producto ya en negativo se puede vender si la bandera lo permite', async () => {
      // 7.809 productos del catálogo legado llegan con stock negativo.
      jest.spyOn(productsService, 'findOne')
        .mockResolvedValue({ ...productWith(true), stock_quantity: -4 });

      await expect(service.createOrder(dto, mockUser)).resolves.toBeDefined();
    });
  });
```

`generateOrderNumber` no está mockeado y consulta el repositorio de pedidos; por eso el `beforeEach` espía `findAndCount`. Si aun así falla por ahí, **mockea `generateOrderNumber` con `jest.spyOn(service as any, 'generateOrderNumber').mockResolvedValue('ORD1')`** y sigue. Las cuatro aserciones de arriba no se tocan: si una de ellas estorba, para y dilo.

- [ ] **Step 2: Corre el test y comprueba que falla**

```bash
cd new-implementation/backend && npx jest --testPathPattern "sales.service" -t "venta sin existencias"
```

Esperado: los tres últimos FALLAN con `BadRequestException: Insufficient stock…`.

- [ ] **Step 3: Arregla `createOrder`**

En `sales.service.ts`, importa `import { canSellWithoutStock } from '../../products/can-sell-without-stock';` y reemplaza el bucle de comprobación de stock:

```ts
    // Check stock availability
    const policy = await this.productsService.getOversellPolicy(user.company_id);
    for (const item of dto.items) {
      const product = await this.productsService.findOne(item.product_id, user);
      if (!product) {
        throw new BadRequestException(
          `Product with ID ${item.product_id} not found`,
        );
      }
      if (
        product.stock_quantity < item.quantity &&
        !canSellWithoutStock(product, policy)
      ) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`,
        );
      }
    }
```

- [ ] **Step 4: Corre el test y comprueba que pasa**

```bash
cd new-implementation/backend && npx jest --testPathPattern "sales.service"
```

Esperado: PASS, incluidos los tests preexistentes de stock insuficiente.

- [ ] **Step 5: Verificación por mutación**

Quita el `&& !canSellWithoutStock(product, policy)`: *"acepta si la bandera del producto lo permite"* debe ponerse **rojo**. Luego invierte la condición a `|| canSellWithoutStock(...)`: *"rechaza si el producto no puede venderse"* debe ponerse **rojo**. Restaura y cita ambos.

- [ ] **Step 6: Commitea**

```bash
git add src/modules/sales/services/sales.service.ts src/modules/sales/tests/sales.service.spec.ts
git commit -m "feat(sales): createOrder respeta la bandera de venta sin existencias"
```

---

### Task 6: El cobro descuenta en negativo y marca el movimiento

**Files:**
- Modify: `new-implementation/backend/src/modules/sales/services/payments.service.ts:120-185`
- Test: `new-implementation/backend/src/modules/sales/tests/payments-checkout.service.spec.ts`

**Interfaces:**
- Consumes: `ProductsService.getOversellPolicy` y `canSellWithoutStock` (T4).
- Produces: nada nuevo.

**Contexto crítico:** esta es la revalidación **dentro de la transacción, con bloqueo pesimista**, que añadió `SPEC-BACK-003`. Entre crear el pedido y cobrarlo otra caja pudo llevarse la última unidad, así que la comprobación tiene que seguir existiendo — lo que cambia es que ahora la bandera puede levantarla. **No toques la guarda de exactamente-una-vez** (`alreadyDeducted`): es la que impide el doble descuento por la vía `confirmed`, y tiene su propio comentario explicando por qué mira el estado de la fila bloqueada.

`PaymentsService` **no** inyecta hoy `ProductsService`; hay que añadirlo como quinto argumento del constructor. `SalesModule` ya importa `ProductsModule`, así que la inyección resuelve. **Actualiza el `new PaymentsService(...)` de `payments-checkout.service.spec.ts:51-56`**, que instancia el servicio a mano.

- [ ] **Step 1: Escribe el test que falla**

En `payments-checkout.service.spec.ts`, añade al `beforeEach` un quinto argumento en la construcción:

```ts
    productsService = {
      getOversellPolicy: jest.fn(async () => ({ allowNegativeStock: false })),
    } as any;

    service = new PaymentsService(
      { findOne: jest.fn(async () => order) } as any, // orderRepository
      { save: jest.fn(async (p: any) => p) } as any,  // paymentRepository
      dataSource,
      locations,
      productsService,
    );
```

y declara `let productsService: any;` arriba con las demás. Luego el `describe` nuevo:

```ts
  describe('venta sin existencias', () => {
    it('sin bandera, sigue rechazando el cobro por stock insuficiente', async () => {
      product.stock_quantity = 1;
      product.allow_sale_without_stock = false;

      await expect(
        service.recordPayment('o1', { payment_method: 'cash', amount: 29750 } as any, USER),
      ).rejects.toThrow('Insufficient stock');
      expect(product.stock_quantity).toBe(1);
    });

    it('con la bandera del producto, descuenta y deja el stock negativo', async () => {
      product.stock_quantity = 1;
      product.allow_sale_without_stock = true;

      await service.recordPayment('o1', { payment_method: 'cash', amount: 29750 } as any, USER);

      expect(product.stock_quantity).toBe(-1);
      expect(order.status).toBe(OrderStatus.COMPLETED);
    });

    it('marca la nota del movimiento cuando el stock queda negativo', async () => {
      product.stock_quantity = 1;
      product.allow_sale_without_stock = true;

      await service.recordPayment('o1', { payment_method: 'cash', amount: 29750 } as any, USER);

      const mov = inserted.find((i) => i.entity === StockMovement);
      expect(mov.obj.movement_type).toBe(MovementType.OUT);
      expect(mov.obj.quantity).toBe(2);
      expect(mov.obj.notes).toBe('Venta ORD1 (sin existencias)');
    });

    it('una venta CON existencias deja la nota sin marcar', async () => {
      product.stock_quantity = 50;
      product.allow_sale_without_stock = true;

      await service.recordPayment('o1', { payment_method: 'cash', amount: 29750 } as any, USER);

      const mov = inserted.find((i) => i.entity === StockMovement);
      expect(mov.obj.notes).toBe('Venta ORD1');
    });

    it('con la bandera en null, hereda del global encendido', async () => {
      product.stock_quantity = 0;
      product.allow_sale_without_stock = null;
      productsService.getOversellPolicy.mockResolvedValue({ allowNegativeStock: true });

      await service.recordPayment('o1', { payment_method: 'cash', amount: 29750 } as any, USER);

      expect(product.stock_quantity).toBe(-2);
    });
  });
```

- [ ] **Step 2: Corre el test y comprueba que falla**

```bash
cd new-implementation/backend && npx jest --testPathPattern "payments-checkout"
```

Esperado: FAIL — el constructor no acepta el quinto argumento / se lanza `Insufficient stock` donde no debería.

- [ ] **Step 3: Arregla `payments.service.ts`**

Añade los imports y la dependencia:

```ts
import { ProductsService } from '../../products/products.service';
import { canSellWithoutStock } from '../../products/can-sell-without-stock';
```

```ts
    private readonly locations: InventoryLocationsService,
    private readonly productsService: ProductsService,
  ) {}
```

Dentro de `recordPayment`, antes del `for (const item of items)`:

```ts
        const policy = await this.productsService.getOversellPolicy(locked.company_id);
```

y dentro del bucle, sustituye la comprobación y la escritura del movimiento:

```ts
          // El bloqueo pesimista sigue siendo necesario aunque se permita la
          // sobreventa: es lo que serializa el descuento entre dos cajas.
          const oversold = product.stock_quantity < item.quantity;
          if (oversold && !canSellWithoutStock(product, policy)) {
            throw new BadRequestException(
              `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, required: ${item.quantity}`,
            );
          }

          product.stock_quantity -= item.quantity;
          await manager.save(Product, product);

          await manager.insert(
            StockMovement,
            manager.create(StockMovement, {
              company_id: locked.company_id,
              product_id: item.product_id,
              location_id: locationId,
              movement_type: MovementType.OUT,
              quantity: item.quantity,
              reference_id: locked.id,
              // Mismo OUT y misma cantidad: los informes que agrupan por tipo
              // no se enteran. La nota es lo único que distingue la sobreventa,
              // y con ella queda el rastro de CUÁNDO el inventario se fue a negativo.
              notes: oversold
                ? `Venta ${locked.order_number} (sin existencias)`
                : `Venta ${locked.order_number}`,
              created_by: user.id,
            }),
          );
```

- [ ] **Step 4: Corre los tests y comprueba que pasan**

```bash
cd new-implementation/backend && npx jest --testPathPattern "payments"
```

Esperado: PASS, incluidos los tres tests preexistentes de `payments-checkout` (pago completo, parcial, y el de no-doble-descuento).

- [ ] **Step 5: Verificación por mutación**

1. Quita el `&& !canSellWithoutStock(product, policy)` → *"sin bandera, sigue rechazando"* debe ponerse **rojo**.
2. Deja la nota siempre como `Venta ${locked.order_number}` → *"marca la nota del movimiento"* debe ponerse **rojo**.
3. Deja la nota siempre marcada → *"una venta CON existencias deja la nota sin marcar"* debe ponerse **rojo**.

Restaura tras cada una y cita los tres.

- [ ] **Step 6: Commitea**

```bash
cd new-implementation/backend && npx tsc --noEmit -p tsconfig.json
git add src/modules/sales
git commit -m "feat(sales): el cobro permite stock negativo segun la bandera

La revalidacion con bloqueo pesimista de SPEC-BACK-003 sigue en pie: lo que
cambia es que la bandera puede levantarla. El movimiento sigue siendo un OUT
de la misma cantidad; solo la nota distingue la sobreventa."
```

---

### Task 7: `deductStock` respeta la bandera

**Files:**
- Modify: `new-implementation/backend/src/modules/products/products.service.ts:161-172`
- Test: `new-implementation/backend/src/modules/products/tests/products.service.spec.ts`

**Interfaces:**
- Consumes: `canSellWithoutStock`, `getOversellPolicy` (T4).
- Produces: nada nuevo.

Es la vía `CONFIRMED` (`SalesService.updateOrderStatus` la llama por cada ítem al confirmar un pedido). **Esta vía no escribe en `stock_movements` en absoluto** — hueco preexistente que esta tarea documenta con un comentario y **no** arregla: añadir la contabilidad aquí es un cambio de otro tamaño.

- [ ] **Step 1: Escribe el test que falla**

Añade a `products.service.spec.ts`:

```ts
  describe('deductStock — venta sin existencias', () => {
    const productWith = (flag: boolean | null, stock = 1) => ({
      id: 'p1', company_id: 'company-uuid', name: 'Café',
      stock_quantity: stock, allow_sale_without_stock: flag,
    }) as any;

    beforeEach(() => {
      jest.spyOn(repository, 'save').mockImplementation(async (p: any) => p);
      jest.spyOn(settingsService, 'getSettings')
        .mockResolvedValue({ allowNegativeStock: false } as any);
    });

    it('sin bandera, sigue rechazando por stock insuficiente', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(productWith(false));

      await expect(service.deductStock('p1', 3, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('con la bandera, descuenta y deja el stock negativo', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(productWith(true));

      const result = await service.deductStock('p1', 3, mockUser);

      expect(result.stock_quantity).toBe(-2);
    });

    it('con la bandera en null, hereda del global encendido', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(productWith(null));
      jest.spyOn(settingsService, 'getSettings')
        .mockResolvedValue({ allowNegativeStock: true } as any);

      const result = await service.deductStock('p1', 3, mockUser);

      expect(result.stock_quantity).toBe(-2);
    });
  });
```

Añade `BadRequestException` al import de `@nestjs/common` del fichero de test si no está.

- [ ] **Step 2: Corre el test y comprueba que falla**

```bash
cd new-implementation/backend && npx jest --testPathPattern "products.service" -t "deductStock"
```

Esperado: los dos últimos FALLAN con `BadRequestException`.

- [ ] **Step 3: Arregla `deductStock`**

```ts
  /**
   * Vía `CONFIRMED` del descuento de inventario.
   *
   * OJO: a diferencia del cierre de venta en `PaymentsService`, esta vía NO
   * escribe en `stock_movements`. Es un hueco preexistente, anotado en el
   * diseño de POS-BACK-004 §3, no algo que esta función deba resolver de paso.
   */
  async deductStock(productId: string, quantity: number, user: User): Promise<Product> {
    const product = await this.findOne(productId, user);
    const policy = await this.getOversellPolicy(user.company_id);

    if (
      product.stock_quantity < quantity &&
      !canSellWithoutStock(product, policy)
    ) {
      throw new BadRequestException(
        `Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${quantity}`,
      );
    }

    product.stock_quantity -= quantity;
    return await this.productRepository.save(product);
  }
```

- [ ] **Step 4: Corre la suite completa**

```bash
cd new-implementation/backend && npm test
```

Esperado: todo verde.

- [ ] **Step 5: Verificación por mutación**

Quita el `&& !canSellWithoutStock(product, policy)` → *"sin bandera, sigue rechazando"* debe ponerse **rojo**. Restaura y cítalo.

- [ ] **Step 6: Commitea**

```bash
cd new-implementation/backend && npx tsc --noEmit -p tsconfig.json && npm run lint:ci && npm run lint:budget
git add src/modules/products
git commit -m "feat(products): deductStock respeta la bandera de venta sin existencias

Documenta ademas que esta via no escribe stock_movements: hueco preexistente,
no se arregla aqui."
```

---

### Task 8: La caja deja de bloquear, y avisa

**Files:**
- Modify: `new-implementation/frontend/types/product.ts`
- Modify: `new-implementation/frontend/app/(panel)/sales/page.tsx:45-73`
- Modify: `new-implementation/frontend/components/sales/ProductSearch.tsx:78-90`
- Modify: `new-implementation/frontend/components/sales/SalesCart.tsx`
- Modify: `new-implementation/frontend/types/sale.ts`
- Modify: `new-implementation/frontend/messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: `can_sell_without_stock: boolean` en cada producto de `GET /products` (T4).
- Produces: `CartItem.sold_without_stock?: boolean` para que el carrito pueda contar los artículos marcados.

**Son TRES guardas, no dos.** Además de las dos de `page.tsx` que nombra la spec, `ProductSearch.tsx` calcula `outOfStock` y pone `disabled` en la tarjeta: hoy un producto sin existencias ni siquiera se puede pulsar.

**Y hay un bug vivo que se corrige de paso:** la condición actual es `stock_quantity === 0`, que **no bloquea los negativos**. Con 7.809 productos migrados en negativo, hoy se añaden al carrito y revientan con 400 en el backend. Pasa a `<= 0`.

- [ ] **Step 1: Amplía los tipos**

En `types/product.ts`, dentro de `interface Product`:

```ts
  /** Tri-estado por producto; `null` hereda del ajuste global de la empresa. */
  allow_sale_without_stock?: boolean | null;
  /** Resuelto por el backend. La caja no puede resolverlo: GET /settings es admin/manager. */
  can_sell_without_stock?: boolean;
```

y en `interface CreateProductDto` y `UpdateProductDto` del mismo fichero:

```ts
  allow_sale_without_stock?: boolean | null;
```

En `types/sale.ts`, dentro de `interface CartItem`, añade `sold_without_stock?: boolean;`.

- [ ] **Step 2: Añade las cadenas i18n**

Para el distintivo de la tarjeta **no hace falta clave nueva**: `ProductSearch`
ya pinta `tInventory('table.noStock')` cuando no hay stock. Lo que cambia es el
color y que la tarjeta siga pulsable.

Sí hacen falta dos claves para el aviso agregado del carrito. En
`messages/es.json`, sección `sales` (la que usa `SalesCart` con
`useTranslations('sales')`):

```json
    "oversellNoticeOne": "1 artículo se vende sin existencias",
    "oversellNoticeMany": "{count} artículos se venden sin existencias",
```

y en `messages/en.json`, misma sección:

```json
    "oversellNoticeOne": "1 item is being sold without stock",
    "oversellNoticeMany": "{count} items are being sold without stock",
```

Las dos claves deben existir en ambos ficheros: la paridad es una puerta de CI.

- [ ] **Step 3: Corrige las tres guardas**

En `app/(panel)/sales/page.tsx`, `handleAddProduct`:

```ts
  const handleAddProduct = (product: Product) => {
    const canOversell = product.can_sell_without_stock ?? false;
    // `<= 0`, no `=== 0`: 7.809 productos migrados llegan con stock negativo y
    // la comparación estricta no los bloqueaba — se añadían al carrito y el
    // backend devolvía 400 al cobrar.
    if (!canOversell && product.stock_quantity <= 0) return;
    const existing = cart.items.find((i) => i.product_id === product.id);
    let newItems: CartItem[];

    if (existing) {
      if (!canOversell && existing.quantity >= product.stock_quantity) return;
      newItems = cart.items.map((i) =>
        i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
          : i
      );
    } else {
      newItems = [
        ...cart.items,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          tax_rate: product.tax_rate ?? TAX_RATE * 100,
          subtotal: product.price,
          stock_quantity: product.stock_quantity,
          sold_without_stock: product.stock_quantity <= 0,
          image_url: product.image_url,
        },
      ];
    }
    applyCart(recalc(newItems));
  };
```

En `components/sales/ProductSearch.tsx`, sustituye las dos líneas del `filtered.map` (hoy `const outOfStock = product.stock_quantity === 0;` y la de `lowStock`) por:

```ts
          const canOversell = product.can_sell_without_stock ?? false;
          const noStock = product.stock_quantity <= 0;
          // `outOfStock` pasa a significar "no se puede vender", no "no hay".
          const outOfStock = noStock && !canOversell;
          const sellingWithoutStock = noStock && canOversell;
          const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
```

`disabled={outOfStock}` y el `onClick` se quedan igual: ahora `outOfStock` solo es cierto cuando de verdad no se puede vender. El distintivo se hace en el `<span>` del stock que ya existe al final de la tarjeta — cambia sus dos expresiones:

```tsx
                <span
                  className={cn(
                    'text-[9px] font-semibold px-1.5 py-0.5 rounded border',
                    outOfStock
                      ? 'text-destructive border-destructive/30'
                      : sellingWithoutStock || lowStock
                      ? 'text-amber-500 border-amber-500/30'
                      : 'text-emerald-500 border-emerald-500/30'
                  )}
                >
                  {noStock ? tInventory('table.noStock') : product.stock_quantity}
                </span>
```

Así un producto sin existencias vendible se ve en ámbar, pulsable y con el texto "sin existencias", y uno no vendible sigue en rojo y deshabilitado.

En `components/sales/SalesCart.tsx`, calcula el contador justo después de los `useTranslations` (línea ~41):

```ts
  const oversellCount = items.filter((i) => i.sold_without_stock).length;
```

y mete el aviso en el bloque de totales, **antes** de la fila del total (la que pinta `tCommon('total')`, línea ~133):

```tsx
        {oversellCount > 0 && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
            {oversellCount === 1
              ? t('oversellNoticeOne')
              : t('oversellNoticeMany', { count: oversellCount })}
          </p>
        )}
```

Marca además la línea del artículo: en el `items.map` del carrito, donde se pinta `formatCOP(item.subtotal)` (línea ~104), añade delante `{item.sold_without_stock && <span className="text-amber-500 mr-1">⚠</span>}`.

- [ ] **Step 4: Comprueba tipos, lint e i18n**

```bash
cd new-implementation/frontend
npx tsc --noEmit
npm run lint
node scripts/smoke/i18n-parity.cjs && node scripts/smoke/i18n-lint.cjs
```

Esperado: los tres limpios. `npm run lint` muta ficheros; revisa el diff antes de añadir.

- [ ] **Step 5: Verificación por mutación**

No hay test unitario de frontend en este repo, así que la mutación se comprueba **con el tipo**: cambia la guarda a `product.stock_quantity === 0` y verifica manualmente contra el despliegue en la Tarea 12 que un producto con stock `-4` y bandera apagada **no** se puede añadir. Anota en el reporte que esta tarea depende de la verificación de la Tarea 12 y no tiene red unitaria.

- [ ] **Step 6: Commitea**

```bash
git add types/product.ts types/sale.ts "app/(panel)/sales/page.tsx" components/sales messages/es.json messages/en.json
git commit -m "feat(sales): la caja permite vender sin existencias y lo avisa

Tres guardas, no dos: page.tsx tenia dos y ProductSearch.tsx deshabilitaba la
tarjeta. Corrige ademas stock_quantity === 0, que no bloqueaba los negativos:
los 7.809 productos migrados en negativo se anadian al carrito y reventaban
con 400 al cobrar."
```

---

### Task 9: Selector tri-estado en el formulario de producto

**Files:**
- Modify: `new-implementation/frontend/components/products/ProductForm.tsx`
- Modify: `new-implementation/frontend/components/products/ProductFormFields.tsx`
- Modify: `new-implementation/frontend/messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: `CreateProductDto.allow_sale_without_stock` (T8), y el DTO del backend que lo acepta (T1).
- Produces: nada.

`ProductFormFields` está cerca del límite de 200 líneas del repo. Si al añadir el bloque lo supera, extrae el `<select>` a un componente hermano pequeño (`AllowSaleWithoutStockField.tsx`) en la misma carpeta, en vez de dejar crecer el fichero.

> **Defecto adyacente, nombrado y NO arreglado aquí: la categoría se pierde en
> silencio.** El formulario manda `category: ''` — un nombre en texto libre —
> mientras el DTO del backend declara `category_id` con `@IsUUID()`. Como
> `category` no lleva decoradores, `whitelist: true` la descarta **sin error**.
> Consecuencia: tras la Tarea 1 el operador puede crear un producto, elegir
> categoría, y la categoría desaparece sin que nada avise. **La Tarea 12 pasaría
> igual**, D3 cerraría, y esto reaparecería después como regresión. Tiene spec
> propia: **`SPEC-BACK-005`** (`docs/specs/SPEC-BACK-005-product-category-binding.md`).
> **No lo arregles en esta tarea.**

- [ ] **Step 1: Añade las cadenas i18n**

En `messages/es.json`, sección `products`:

```json
    "allowSaleWithoutStock": "Venta sin existencias",
    "allowSaleWithoutStockInherit": "Heredar del ajuste global",
    "allowSaleWithoutStockYes": "Sí, permitir",
    "allowSaleWithoutStockNo": "No permitir",
```

En `messages/en.json`, misma sección:

```json
    "allowSaleWithoutStock": "Sale without stock",
    "allowSaleWithoutStockInherit": "Inherit from global setting",
    "allowSaleWithoutStockYes": "Yes, allow",
    "allowSaleWithoutStockNo": "Do not allow",
```

- [ ] **Step 2: Amplía el estado del formulario**

En `ProductForm.tsx`, añade `allow_sale_without_stock: null,` al `useState` inicial y `allow_sale_without_stock: product.allow_sale_without_stock ?? null,` dentro del `useEffect` que hidrata desde `product`. Amplía la firma de `handleChange` para admitir el tri-estado:

```ts
  const handleChange = (
    field: keyof CreateProductDto,
    value: string | number | boolean | null,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
```

y el tipo de `onChange` en `ProductFormFieldsProps` igual.

- [ ] **Step 3: Añade el selector**

En `ProductFormFields.tsx`, junto al campo de `stock_quantity`:

```tsx
      <div>
        <Label htmlFor="allow_sale_without_stock">{t('allowSaleWithoutStock')}</Label>
        <select
          id="allow_sale_without_stock"
          value={
            formData.allow_sale_without_stock === null ||
            formData.allow_sale_without_stock === undefined
              ? 'inherit'
              : String(formData.allow_sale_without_stock)
          }
          onChange={(e) =>
            onChange(
              'allow_sale_without_stock',
              e.target.value === 'inherit' ? null : e.target.value === 'true',
            )
          }
          className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="inherit">{t('allowSaleWithoutStockInherit')}</option>
          <option value="true">{t('allowSaleWithoutStockYes')}</option>
          <option value="false">{t('allowSaleWithoutStockNo')}</option>
        </select>
      </div>
```

- [ ] **Step 4: Comprueba tipos, lint, i18n y tamaño**

```bash
cd new-implementation/frontend
npx tsc --noEmit && npm run lint
node scripts/smoke/i18n-parity.cjs && node scripts/smoke/i18n-lint.cjs
wc -l components/products/ProductFormFields.tsx
```

Esperado: limpio, y el fichero por debajo de 200 líneas (si no, extrae según la nota de arriba).

- [ ] **Step 5: Commitea**

```bash
git add components/products messages/es.json messages/en.json
git commit -m "feat(products): selector tri-estado de venta sin existencias en el alta"
```

---

### Task 10: Migrar `EsFactSinExistencia` y re-correr el parity

**Files:**
- Modify: `new-implementation/migration/src/rules/products.rule.ts`

**Interfaces:**
- Consumes: la columna `products.allow_sale_without_stock` (T3).
- Produces: nada para tareas posteriores.

**Por qué `verify: 'ignore'`:** el legado guarda `tinyint` (1/0) y el destino un booleano. Con `verify: 'exact'` el parity compararía `1` contra `true` y se pondría rojo. La línea de `EsActivo` justo debajo ya resuelve exactamente este caso; copia su forma.

- [ ] **Step 1: Añade el mapeo**

En `migration/src/rules/products.rule.ts`, en el array `fields`, junto a la línea de `EsActivo`:

```ts
    // Sobreventa por producto. 30.004 de 30.276 filas del dump real lo traen a
    // 1; los 272 con 0 están activos, así que la lista de excepciones es viva y
    // hay que preservarla. `verify: 'ignore'` como en `EsActivo`: con 'exact' el
    // 1 del tinyint legado compararía contra el `true` del booleano y redderá el parity.
    { from: 'EsFactSinExistencia', to: 'allow_sale_without_stock',
      transform: (v) => !!Number(v), verify: 'ignore' },
```

- [ ] **Step 2: Corre la suite de migración**

```bash
cd new-implementation/migration && npm install && npm test
```

`pretest` compila el backend primero y la suite usa Testcontainers, así que necesita Docker corriendo. **Esto es lo que prueba de verdad que la columna nullable se lee y se escribe bien contra MySQL real** — ningún test unitario con repositorio mockeado lo cubre.

Esperado: verde. Si falla por "column not found", falta correr las migraciones contra la base de prueba: revisa que la nueva `AddOversellFlags` esté en `dist/`.

- [ ] **Step 3: Re-corre el parity contra el dump real**

```bash
cd new-implementation/migration
NODE_ENV=migration npm run migrate -- reset
NODE_ENV=migration npm run migrate -- import
NODE_ENV=migration npm run migrate -- verify   # exit 0 = limpio
NODE_ENV=migration npm run migrate -- report
```

Esperado: `verify` sale con 0. Comprueba además, con una consulta directa a la base de destino, que el reparto coincide con el dump:

```sql
SELECT allow_sale_without_stock, COUNT(*) FROM products GROUP BY 1;
-- esperado: 1 -> 30004, 0 -> 272   (el dump tiene 30.276 filas en `inventarios`)
```

Si el reparto no cuadra, **para y repórtalo**: significa que el transformer o la columna nullable no se comportan como se diseñó.

- [ ] **Step 4: Actualiza el registro de verificación de MIGR-001**

Actualiza el `**Status**:` de `docs/specs/SPEC-MIGR-001-*.md` con la fecha del re-run y el resultado. Un informe verde solo prueba la revisión que lo produjo, así que cita la fecha y el commit.

- [ ] **Step 5: Commitea**

```bash
cd /home/gor/devs/pos-modernization
git add new-implementation/migration/src/rules/products.rule.ts docs/specs
git commit -m "feat(migration): mapea EsFactSinExistencia a allow_sale_without_stock

30.004 de 30.276 productos legados lo traen a 1 y los 272 restantes, activos,
a 0: la lista de excepciones es viva y hoy se descartaba al migrar.
verify:'ignore' como EsActivo — con 'exact' el 1 del tinyint compararia
contra el true del booleano y redderia el parity."
```

---

### Task 11: Puertas de CI sobre todo el árbol

**Files:** ninguno, salvo lo que haga falta arreglar.

- [ ] **Step 1: Backend**

```bash
cd new-implementation/backend
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint:ci
npm run lint:budget
npm run build
```

- [ ] **Step 2: Frontend**

```bash
cd new-implementation/frontend
npx tsc --noEmit
npm run lint:ci 2>/dev/null || npm run lint
node scripts/smoke/i18n-parity.cjs && node scripts/smoke/i18n-lint.cjs
npm run build
```

- [ ] **Step 3: Reporta el resultado con las cifras**

Di cuántos tests corrieron y cuántos pasaron, sobre **todo** el árbol, no sobre los directorios que tocaste. Si algo está rojo, arréglalo antes de seguir; si no puedes, dilo explícitamente y no marques la tarea como hecha.

- [ ] **Step 4: Commitea lo que haya cambiado**

```bash
git add -A && git commit -m "chore: puertas de CI verdes tras POS-BACK-004"
```

---

### Task 12: Verificación contra el despliegue real

**Files:** `new-implementation/STAGING-DRY-RUN-RESULTS.md` (anotar el resultado).

Lo que un unitario no puede probar. **No puedes disparar el despliegue: pídele a Gandhi que redespliegue en Coolify** e indícale que la migración corre sola al arrancar (`DB_RUN_MIGRATIONS=true` en `docker-compose.coolify.yml`).

- [ ] **Step 1: Pide el redespliegue y espera confirmación**

Indícale que la nueva migración `AddOversellFlags1781700000000` corre en el arranque y que **resetea `settings.allowNegativeStock` a 0** en las filas existentes — es un cambio de comportamiento deliberado, no un efecto secundario.

- [ ] **Step 2: Alta de producto desde el navegador (D3, §4-2 del dry-run)**

Con el formulario en blanco salvo nombre, SKU `prd-001` en minúscula, precio y stock:

- el producto se crea sin 400;
- el SKU queda guardado como `PRD-001`;
- `company_id` es el de la empresa de la sesión;
- deja `código de barras` e `imagen` vacíos, que es el caso que fallaba.

- [ ] **Step 3: Venta sin existencias de punta a punta**

1. Crea un producto con stock `0` y *Venta sin existencias → Sí, permitir*.
2. En la caja: la tarjeta se puede pulsar y muestra el distintivo; el carrito muestra el aviso agregado.
3. Cobra la venta completa.
4. Comprueba en la base: `products.stock_quantity` quedó negativo y hay una fila en `stock_movements` con `movement_type = 'OUT'` y `notes` terminando en `(sin existencias)`.

- [ ] **Step 4: El caso contrario, que es el que protege a los 272**

1. Crea un producto con stock `0` y *No permitir*.
2. En la caja la tarjeta sigue deshabilitada.
3. Enciende *Permitir stock negativo* en `/settings` y recarga: la tarjeta **sigue** deshabilitada. Eso es la precedencia funcionando.
4. Con un tercer producto en *Heredar*, la tarjeta **sí** se habilita con el global encendido.

- [ ] **Step 5: Anota el resultado del dry-run y abre el PR**

Escribe el resultado en `STAGING-DRY-RUN-RESULTS.md` (D3 en verde, con fecha).

Rama `back-004-product-create-and-oversell` → `main`. El cuerpo del PR lleva **una sola vez** la keyword de cierre:

```
Closes POS-BACK-004
```

Sin ella el issue no se cierra; nombrar el id sin keyword no lo promueve. Pídele el merge a Gandhi: los commits entran a `main` sin PR ni checks, pero no se aprovecha eso.

- [ ] **Step 6: DESPUÉS del merge, escribe la línea de estado**

**El orden importa.** El merge con `Closes POS-BACK-004` hace que Kairos reescriba solo el `**Status**` de `SPEC-BACK-004` a DONE. Si escribes tú la línea con su cola de evidencia *antes* del merge y Kairos reescribe la línea entera, la cola se pierde — y la cola es justamente lo que la convención existe para conservar. Escríbela después, sobre lo que Kairos haya dejado:

```
**Status**: DONE — <fecha> (PR #N). D3 cerrado y verificado en navegador contra
el despliegue; venta sin existencias de punta a punta. Abiertos: deductStock no
escribe stock_movements; checkReorderLevels marca como stock bajo permanente
todo producto sobrevendido; la categoría del formulario se descarta en silencio
(§5); divergencia de los dos libros de inventario (SPEC-BACK-003).
```

El guard de Kairos es monotónico: DONE no se puede retroceder, así que no hay riesgo de pisarla en el otro sentido.

---

## Notas para quien ejecute

**Orden y paralelismo.** T1→T2 son secuenciales. T3 es independiente de T1/T2 y puede ir en paralelo. T4 depende de T3. T5, T6 y T7 dependen de T4 y son independientes entre sí. T8 depende de T4; T9 depende de T1 y T8. T10 depende de T3. T11 y T12 van al final, en ese orden.

**Lo que NO hay que arreglar de paso**, aunque lo veas y duela:
- `inventory/services/stock.service.ts` y el libro de `warehouse_locations.current_stock` — es el otro libro de inventario, ya roto por `capacity: 0`, y es un ítem propio y mayor. Verificado que dejarlo fuera no abre ningún agujero: **`deductStockOnOrder` no tiene ni un solo llamador** (solo `inventory.controller` inyecta `StockService`, para los endpoints de ajuste), así que el camino de venta nunca lo alcanza.
- El campo `category` del formulario, que se pierde en silencio — ver la nota de la Tarea 9.
- `deductStock` sin `stock_movements`.
- `checkReorderLevels` y `StockBadge` marcando como stock bajo permanente todo producto sobrevendido — ya pasa hoy con los 7.809 negativos migrados.
- La guarda de exactamente-una-vez de `PaymentsService` (`alreadyDeducted`).

Si te topas con algo de esta lista y crees que bloquea tu tarea, **para y dilo** en vez de ampliarla.
