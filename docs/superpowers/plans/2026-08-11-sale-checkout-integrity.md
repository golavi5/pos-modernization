# Integridad del cierre de venta — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que una venta cerrada en la caja registre el importe correcto, quede pagada y completada, y descuente el inventario dejando rastro.

**Architecture:** Tres cambios independientes. (1) Un `ValueTransformer` de TypeORM normaliza las columnas `DECIMAL` a `number`, lo que elimina la aritmética con strings que producía el total incorrecto. (2) `PaymentsService.recordPayment` pasa a ser transaccional y, al quedar el pedido totalmente pagado, lo mueve a `completed`, descuenta stock con bloqueo pesimista y escribe `stock_movements`. (3) La ubicación de inventario que ese movimiento exige se crea bajo demanda. El frontend solo encadena la segunda llamada.

**Tech Stack:** NestJS 10, TypeORM 0.3, MySQL 8, Jest; Next.js 14 (App Router), Axios, React Query.

## Global Constraints

- Backend en `new-implementation/backend`, frontend en `new-implementation/frontend`.
- **Ninguna migración**: el `ValueTransformer` es de aplicación y el esquema no cambia.
- Cada test se verifica **por mutación**: revertir el arreglo, comprobar que el test se pone rojo, restaurarlo. Un test que pasa contra el código viejo no protege nada.
- Los tests que usan `@Type` de `class-transformer` necesitan `import 'reflect-metadata';` en la primera línea, o fallan con `Reflect.getMetadata is not a function`.
- Comandos: `cd new-implementation/backend && npx jest --testPathPattern "<patrón>"`; suite completa `npm test`; tipos `npx tsc --noEmit -p tsconfig.json`.
- Formato de commit del repo: `fix(<ámbito>): <resumen en minúscula>`.

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `backend/src/common/column-numeric.transformer.ts` | **Crear.** El `ValueTransformer` compartido. Única fuente de la conversión. |
| `backend/src/modules/products/entities/product.entity.ts` | **Modificar.** `price`, `cost`, `tax_rate`. |
| `backend/src/modules/sales/entities/order.entity.ts` | **Modificar.** `subtotal`, `tax_amount`, `discount_amount`, `total_amount`. |
| `backend/src/modules/sales/entities/order-item.entity.ts` | **Modificar.** `unit_price`, `subtotal`, `tax_amount`, `total`. |
| `backend/src/modules/sales/entities/payment.entity.ts` | **Modificar.** `amount`. |
| `backend/src/modules/inventory/services/inventory-locations.service.ts` | **Crear.** `ensureDefaultLocation()`. Aislado para poder probarlo sin el flujo de venta. |
| `backend/src/modules/sales/services/payments.service.ts` | **Modificar.** `recordPayment` transaccional + cierre de venta. |
| `frontend/lib/api/payments.ts` | **Crear.** Cliente del endpoint de pagos. |
| `frontend/app/(panel)/sales/page.tsx` | **Modificar.** Encadenar el pago; ocultar "Mixed". |

---

### Task 1: Normalizar los DECIMAL a `number`

Cierra D7 (el total mostrado no coincide con el registrado) y la causa de fondo de D5.

**Files:**
- Create: `new-implementation/backend/src/common/column-numeric.transformer.ts`
- Modify: `new-implementation/backend/src/modules/products/entities/product.entity.ts`
- Modify: `new-implementation/backend/src/modules/sales/entities/order.entity.ts`
- Modify: `new-implementation/backend/src/modules/sales/entities/order-item.entity.ts`
- Modify: `new-implementation/backend/src/modules/sales/entities/payment.entity.ts`
- Test: `new-implementation/backend/src/common/column-numeric.transformer.spec.ts`

**Interfaces:**
- Produces: `numericTransformer: ValueTransformer` — `from(value: string | null | undefined): number | null | undefined`, `to(value)` identidad. Lo consumen las cuatro entidades.

- [ ] **Step 1: Escribir el test que falla**

`new-implementation/backend/src/common/column-numeric.transformer.spec.ts`:

```ts
import { numericTransformer } from './column-numeric.transformer';

describe('numericTransformer', () => {
  it('convierte el string de MySQL a número', () => {
    expect(numericTransformer.from('25000.00')).toBe(25000);
    expect(typeof numericTransformer.from('25000.00')).toBe('number');
  });

  it('preserva null y undefined (columnas nullable)', () => {
    expect(numericTransformer.from(null)).toBeNull();
    expect(numericTransformer.from(undefined)).toBeUndefined();
  });

  it('no rompe si ya viene como número', () => {
    expect(numericTransformer.from(25000 as unknown as string)).toBe(25000);
  });

  it('al escribir devuelve el valor tal cual', () => {
    expect(numericTransformer.to(25000)).toBe(25000);
  });

  it('sumar dos valores convertidos NO concatena', () => {
    const a = numericTransformer.from('25000.00') as number;
    const b = numericTransformer.from('4750.00') as number;
    expect(a + b).toBe(29750);
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd new-implementation/backend && npx jest --testPathPattern "column-numeric"`
Expected: FAIL — `Cannot find module './column-numeric.transformer'`

- [ ] **Step 3: Implementar el transformer**

`new-implementation/backend/src/common/column-numeric.transformer.ts`:

```ts
import { ValueTransformer } from 'typeorm';

/**
 * MySQL devuelve DECIMAL como string para no perder precisión, y TypeORM lo
 * entrega tal cual. En JS eso hace que `0 + "25000.00"` CONCATENE en vez de
 * sumar: la caja mostraba Total $25.000 sobre una venta de $29.750
 * (dry-run 2026-08-11, D7). Este transformer normaliza en el borde del ORM,
 * así que ningún consumidor tiene que defenderse.
 *
 * `to` es identidad: al escribir, el driver acepta el número.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `cd new-implementation/backend && npx jest --testPathPattern "column-numeric"`
Expected: PASS, 5 tests.

- [ ] **Step 5: Aplicar el transformer a las cuatro entidades**

En cada archivo, añadir el import y `transformer: numericTransformer` a cada `@Column` de tipo `decimal`. Ejemplo en `product.entity.ts`:

```ts
import { numericTransformer } from '../../../common/column-numeric.transformer';

// ...
@Column({
  name: 'price',
  type: 'decimal',
  precision: 10,
  scale: 2,
  transformer: numericTransformer,
})
price: number;
```

Columnas a tocar, todas las de tipo `decimal`:

| Archivo | Columnas |
|---|---|
| `products/entities/product.entity.ts` | `price`, `cost`, `tax_rate` |
| `sales/entities/order.entity.ts` | `subtotal`, `tax_amount`, `discount_amount`, `total_amount` |
| `sales/entities/order-item.entity.ts` | `unit_price`, `subtotal`, `tax_amount`, `total` |
| `sales/entities/payment.entity.ts` | `amount` |

Verificar que no queda ninguna sin transformer:

```bash
cd new-implementation/backend
grep -rn "type: 'decimal'" -A6 src/modules | grep -B1 "scale" | grep -c transformer
```

- [ ] **Step 6: Correr la suite completa**

Run: `cd new-implementation/backend && npx tsc --noEmit -p tsconfig.json && npm test`
Expected: tipos limpios; **254/254 tests en verde**. Si alguno falla por comparar contra un string (`toBe('25000.00')`), corregir la expectativa del test a número — es el comportamiento nuevo y correcto.

- [ ] **Step 7: Verificar por mutación**

Quitar `transformer: numericTransformer` de `product.entity.ts:price`, correr `npx jest --testPathPattern "column-numeric"`. El test unitario del transformer seguirá pasando (prueba la función, no el cableado), así que **además** comprobar el cableado tras desplegar, en Task 5. Restaurar la línea.

- [ ] **Step 8: Commit**

```bash
git add new-implementation/backend/src/common new-implementation/backend/src/modules
git commit -m "fix(entities): normalizar los DECIMAL a number en el borde del ORM"
```

---

### Task 2: Ubicación de inventario bajo demanda

`stock_movements.location_id` es FK NOT NULL y no hay ninguna bodega creada, así que sin esto Task 3 no puede escribir el rastro.

**Files:**
- Create: `new-implementation/backend/src/modules/inventory/services/inventory-locations.service.ts`
- Test: `new-implementation/backend/src/modules/inventory/tests/inventory-locations.service.spec.ts`
- Modify: `new-implementation/backend/src/modules/inventory/inventory.module.ts` (exportar el servicio)

**Interfaces:**
- Consumes: entidades `Warehouse` (`id`, `company_id`, `name`, `is_active`) y `WarehouseLocation` (`id`, `company_id`, `warehouse_id`, `location_code`, `capacity`, `current_stock`).
- Produces: `ensureDefaultLocation(companyId: string, manager: EntityManager): Promise<string>` — devuelve el `location_id`. Task 3 la llama **con el manager de su transacción**.

- [ ] **Step 1: Escribir el test que falla**

`new-implementation/backend/src/modules/inventory/tests/inventory-locations.service.spec.ts`:

```ts
import { InventoryLocationsService } from '../services/inventory-locations.service';
import { Warehouse } from '../entities/warehouse.entity';
import { WarehouseLocation } from '../entities/warehouse-location.entity';

describe('InventoryLocationsService.ensureDefaultLocation', () => {
  const COMPANY = 'c0000000-0000-4000-8000-000000000001';
  let service: InventoryLocationsService;
  let manager: any;
  let saved: any[];

  beforeEach(() => {
    saved = [];
    manager = {
      findOne: jest.fn(),
      save: jest.fn(async (_entity: any, obj: any) => {
        saved.push(obj);
        return obj;
      }),
    };
    service = new InventoryLocationsService();
  });

  it('crea bodega y ubicación cuando no hay ninguna', async () => {
    manager.findOne.mockResolvedValue(null);

    const id = await service.ensureDefaultLocation(COMPANY, manager);

    expect(manager.save).toHaveBeenCalledTimes(2);
    const [warehouse, location] = saved;
    expect(warehouse.company_id).toBe(COMPANY);
    expect(location.company_id).toBe(COMPANY);
    expect(location.warehouse_id).toBe(warehouse.id);
    expect(id).toBe(location.id);
  });

  it('reutiliza la ubicación existente sin crear nada', async () => {
    manager.findOne.mockImplementation(async (entity: any) => {
      if (entity === Warehouse) return { id: 'w1', company_id: COMPANY };
      if (entity === WarehouseLocation) return { id: 'l1', company_id: COMPANY };
      return null;
    });

    const id = await service.ensureDefaultLocation(COMPANY, manager);

    expect(id).toBe('l1');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('crea solo la ubicación si la bodega ya existe', async () => {
    manager.findOne.mockImplementation(async (entity: any) => {
      if (entity === Warehouse) return { id: 'w1', company_id: COMPANY };
      return null;
    });

    await service.ensureDefaultLocation(COMPANY, manager);

    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(saved[0].warehouse_id).toBe('w1');
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd new-implementation/backend && npx jest --testPathPattern "inventory-locations"`
Expected: FAIL — `Cannot find module '../services/inventory-locations.service'`

- [ ] **Step 3: Implementar el servicio**

`new-implementation/backend/src/modules/inventory/services/inventory-locations.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Warehouse } from '../entities/warehouse.entity';
import { WarehouseLocation } from '../entities/warehouse-location.entity';

/**
 * `stock_movements.location_id` es FK NOT NULL, y una empresa recién creada no
 * tiene bodegas. Esto las crea la primera vez que hacen falta.
 *
 * Bajo demanda y no en el arranque a propósito: las empresas se crean en
 * caliente (`POST /companies`), así que un bootstrap de boot dejaría sin
 * ubicación a toda empresa posterior — y el fallo aparecería en su primera
 * venta, no al desplegar.
 */
@Injectable()
export class InventoryLocationsService {
  static readonly DEFAULT_WAREHOUSE_NAME = 'Principal';
  static readonly DEFAULT_LOCATION_CODE = 'GENERAL';

  async ensureDefaultLocation(
    companyId: string,
    manager: EntityManager,
  ): Promise<string> {
    let warehouse = await manager.findOne(Warehouse, {
      where: { company_id: companyId },
    });

    if (!warehouse) {
      warehouse = await manager.save(
        Warehouse,
        manager.create(Warehouse, {
          company_id: companyId,
          name: InventoryLocationsService.DEFAULT_WAREHOUSE_NAME,
          is_active: true,
        }),
      );
    }

    const location = await manager.findOne(WarehouseLocation, {
      where: { company_id: companyId, warehouse_id: warehouse.id },
    });

    if (location) {
      return location.id;
    }

    const created = await manager.save(
      WarehouseLocation,
      manager.create(WarehouseLocation, {
        company_id: companyId,
        warehouse_id: warehouse.id,
        location_code: InventoryLocationsService.DEFAULT_LOCATION_CODE,
        capacity: 0,
        current_stock: 0,
      }),
    );

    return created.id;
  }
}
```

> El test mockea `manager.create` implícitamente devolviendo el objeto que se le
> pasa a `save`. Si `manager.create` no está en el mock, añadirlo:
> `create: jest.fn((_e: any, obj: any) => ({ id: `id-${saved.length}`, ...obj }))`.

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `cd new-implementation/backend && npx jest --testPathPattern "inventory-locations"`
Expected: PASS, 3 tests.

- [ ] **Step 5: Registrar y exportar el servicio**

En `new-implementation/backend/src/modules/inventory/inventory.module.ts`, añadir `InventoryLocationsService` a `providers` y a `exports`, para que el módulo de ventas pueda inyectarlo.

- [ ] **Step 6: Verificar por mutación**

Cambiar el `if (location) return location.id;` por `return (await manager.save(...)).id` incondicional. Correr el test: el caso "reutiliza la ubicación existente" debe ponerse **rojo** con `manager.save` llamado. Restaurar.

- [ ] **Step 7: Commit**

```bash
git add new-implementation/backend/src/modules/inventory
git commit -m "feat(inventory): ubicación por defecto bajo demanda"
```

---

### Task 3: El pago cierra la venta

**Files:**
- Modify: `new-implementation/backend/src/modules/sales/services/payments.service.ts`
- Modify: `new-implementation/backend/src/modules/sales/sales.module.ts` (importar `InventoryModule`)
- Test: `new-implementation/backend/src/modules/sales/tests/payments-checkout.service.spec.ts`

**Interfaces:**
- Consumes: `InventoryLocationsService.ensureDefaultLocation(companyId, manager)` de Task 2.
- Produces: `recordPayment` con el mismo contrato público (`(orderId, dto, user) => Promise<Payment>`); cambian sus efectos, no su firma.

- [ ] **Step 1: Escribir el test que falla**

`new-implementation/backend/src/modules/sales/tests/payments-checkout.service.spec.ts`:

```ts
import 'reflect-metadata';
import { PaymentsService } from '../services/payments.service';
import { OrderStatus, PaymentStatus as OrderPaymentStatus } from '../entities/order.entity';
import { Product } from '../../products/entities/product.entity';
import { StockMovement, MovementType } from '../../inventory/entities/stock-movement.entity';

describe('recordPayment — cierre de venta', () => {
  const USER = { id: 'u1', company_id: 'c1' } as any;
  let service: PaymentsService;
  let order: any;
  let product: any;
  let manager: any;
  let locations: any;
  let dataSource: any;
  let inserted: any[];

  beforeEach(() => {
    inserted = [];
    order = {
      id: 'o1',
      order_number: 'ORD1',
      company_id: 'c1',
      total_amount: 29750,
      status: OrderStatus.DRAFT,
      payment_status: OrderPaymentStatus.UNPAID,
      payments: [],
      order_items: [{ product_id: 'p1', quantity: 2 }],
    };
    product = { id: 'p1', company_id: 'c1', name: 'Café', stock_quantity: 50 };

    manager = {
      findOne: jest.fn(async (entity: any) => (entity === Product ? product : order)),
      save: jest.fn(async (_e: any, obj: any) => obj),
      create: jest.fn((_e: any, obj: any) => obj),
      insert: jest.fn(async (entity: any, obj: any) => { inserted.push({ entity, obj }); }),
    };
    dataSource = { transaction: jest.fn(async (cb: any) => cb(manager)) };
    locations = { ensureDefaultLocation: jest.fn(async () => 'loc1') };

    service = new PaymentsService(
      { findOne: jest.fn(async () => order) } as any, // orderRepository
      { save: jest.fn(async (p: any) => p) } as any,  // paymentRepository
      dataSource,
      locations,
    );
  });

  it('pago completo: completa el pedido, descuenta stock y deja movimiento', async () => {
    await service.recordPayment('o1', { payment_method: 'card', amount: 29750 } as any, USER);

    expect(order.payment_status).toBe(OrderPaymentStatus.PAID);
    expect(order.status).toBe(OrderStatus.COMPLETED);
    expect(product.stock_quantity).toBe(48);
    const mov = inserted.find((i) => i.entity === StockMovement);
    expect(mov).toBeDefined();
    expect(mov.obj.movement_type).toBe(MovementType.OUT);
    expect(mov.obj.quantity).toBe(2);
    expect(mov.obj.reference_id).toBe('o1');
    expect(mov.obj.location_id).toBe('loc1');
  });

  it('pago parcial: no completa ni descuenta', async () => {
    await service.recordPayment('o1', { payment_method: 'cash', amount: 10000 } as any, USER);

    expect(order.payment_status).toBe(OrderPaymentStatus.PARTIALLY_PAID);
    expect(order.status).toBe(OrderStatus.DRAFT);
    expect(product.stock_quantity).toBe(50);
    expect(inserted).toHaveLength(0);
  });

  it('segundo pago sobre pedido ya completado: NO vuelve a descontar', async () => {
    order.status = OrderStatus.COMPLETED;
    order.payment_status = OrderPaymentStatus.PAID;
    order.payments = [{ amount: 29750 }];
    order.total_amount = 40000; // deja saldo, para que el pago sea admisible

    await service.recordPayment('o1', { payment_method: 'cash', amount: 10250 } as any, USER);

    expect(product.stock_quantity).toBe(50);
    expect(inserted).toHaveLength(0);
  });

  it('sin stock suficiente: lanza y no deja el pedido completado', async () => {
    product.stock_quantity = 1;

    await expect(
      service.recordPayment('o1', { payment_method: 'card', amount: 29750 } as any, USER),
    ).rejects.toThrow(/stock/i);

    expect(order.status).not.toBe(OrderStatus.COMPLETED);
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `cd new-implementation/backend && npx jest --testPathPattern "payments-checkout"`
Expected: FAIL — el constructor de `PaymentsService` aún no recibe `dataSource` ni `locations`.

- [ ] **Step 3: Implementar el cierre transaccional**

En `payments.service.ts`: inyectar `DataSource` e `InventoryLocationsService` en el constructor, y sustituir el bloque que va desde `// Create payment record` hasta el `return savedPayment;` por:

```ts
    const wasCompleted = order.status === OrderStatus.COMPLETED;

    const savedPayment = await this.dataSource.transaction(async (manager) => {
      const payment = manager.create(Payment, {
        order_id: orderId,
        payment_method: dto.payment_method,
        amount: dto.amount,
        transaction_id: dto.transaction_id,
        status: PaymentStatus.COMPLETED,
        payment_date: new Date(),
      });
      const saved = await manager.save(Payment, payment);

      const newTotalPaid = totalPaid + dto.amount;
      if (newTotalPaid >= order.total_amount) {
        order.payment_status = OrderPaymentStatus.PAID;
      } else if (newTotalPaid > 0) {
        order.payment_status = OrderPaymentStatus.PARTIALLY_PAID;
      }

      // La guarda es la TRANSICIÓN a completed, no el estado: así un reintento
      // de la caja tras un timeout, o un segundo pago, no vuelven a descontar.
      const becomesCompleted =
        !wasCompleted && order.payment_status === OrderPaymentStatus.PAID;

      if (becomesCompleted) {
        order.status = OrderStatus.COMPLETED;
        const locationId = await this.locations.ensureDefaultLocation(
          order.company_id,
          manager,
        );

        for (const item of order.order_items ?? []) {
          // Bloqueo pesimista: entre crear el pedido y cobrarlo, otra caja pudo
          // llevarse la última unidad. Revalidamos dentro de la transacción.
          const product = await manager.findOne(Product, {
            where: { id: item.product_id, company_id: order.company_id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!product) {
            throw new BadRequestException(
              `Product ${item.product_id} not found`,
            );
          }
          if (product.stock_quantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, required: ${item.quantity}`,
            );
          }

          product.stock_quantity -= item.quantity;
          await manager.save(Product, product);

          await manager.insert(
            StockMovement,
            manager.create(StockMovement, {
              company_id: order.company_id,
              product_id: item.product_id,
              location_id: locationId,
              movement_type: MovementType.OUT,
              quantity: item.quantity,
              reference_id: order.id,
              notes: `Venta ${order.order_number}`,
              created_by: user.id,
            }),
          );
        }
      }

      await manager.save(Order, order);
      return saved;
    });
```

Asegurar que `order` se carga con `relations: ['payments', 'order_items']` en el `findOne` de arriba, y añadir los imports de `DataSource`, `Order`, `OrderStatus`, `Product`, `StockMovement`, `MovementType` e `InventoryLocationsService`.

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `cd new-implementation/backend && npx jest --testPathPattern "payments-checkout"`
Expected: PASS, 4 tests.

- [ ] **Step 5: Importar `InventoryModule` en `sales.module.ts`**

Añadir `InventoryModule` a los `imports` de `SalesModule` para que `InventoryLocationsService` se inyecte.

- [ ] **Step 6: Correr la suite completa**

Run: `cd new-implementation/backend && npx tsc --noEmit -p tsconfig.json && npm test`
Expected: tipos limpios, toda la suite en verde.

- [ ] **Step 7: Verificar por mutación**

Cambiar `!wasCompleted && ...` por solo `order.payment_status === OrderPaymentStatus.PAID`. Correr `npx jest --testPathPattern "payments-checkout"`: el caso "segundo pago … NO vuelve a descontar" debe ponerse **rojo** con `stock_quantity` en 48. Restaurar.

- [ ] **Step 8: Commit**

```bash
git add new-implementation/backend/src/modules/sales
git commit -m "fix(sales): el pago cierra la venta, descuenta stock y deja rastro"
```

---

### Task 4: Encadenar el pago desde la caja

**Files:**
- Create: `new-implementation/frontend/lib/api/payments.ts`
- Modify: `new-implementation/frontend/app/(panel)/sales/page.tsx`
- Modify: `new-implementation/frontend/components/sales/PaymentPanel.tsx` (ocultar "Mixed")

**Interfaces:**
- Consumes: `POST /sales/orders/:orderId/payments` con `{ payment_method: 'cash' | 'card', amount: number }`, que devuelve el `Payment` creado.
- Produces: `paymentsApi.record(orderId: string, data: { payment_method: string; amount: number }): Promise<unknown>`.

- [ ] **Step 1: Crear el cliente de pagos**

`new-implementation/frontend/lib/api/payments.ts`:

```ts
import { apiClient } from './client';

export const paymentsApi = {
  /**
   * Registra el pago de un pedido. Es la llamada que CIERRA la venta: el
   * backend mueve el pedido a `completed` y descuenta inventario cuando queda
   * totalmente pagado. Sin ella el pedido se queda en `draft`/`unpaid`.
   */
  record: async (
    orderId: string,
    data: { payment_method: string; amount: number },
  ) => {
    const response = await apiClient.post(`/sales/orders/${orderId}/payments`, data);
    return response.data;
  },
};
```

- [ ] **Step 2: Encadenar la llamada tras crear el pedido**

En `app/(panel)/sales/page.tsx`, en el handler que hoy llama a `createSale`, esperar el pedido creado y registrar el pago con el total del carrito:

```ts
const order = await createSale.mutateAsync(payload);
await paymentsApi.record(order.id, {
  payment_method: method,          // 'cash' | 'card'
  amount: cart.total,
});
```

El carrito solo se vacía cuando la segunda llamada resuelve. Si falla, mostrar el error y **no** limpiar: el pedido existe y queda pendiente de cobro, así que la caja puede reintentar.

- [ ] **Step 3: Ocultar el botón "Mixed"**

En `PaymentPanel.tsx`, eliminar el botón de pago mixto. El endpoint admite varios pagos por pedido, pero la UI solo manda uno: dejarlo visible mentiría sobre lo que hizo. Añadir el comentario:

```tsx
{/* "Mixed" (varios pagos por pedido) está fuera de alcance: el endpoint lo
    soporta, la UI no. Se oculta en vez de mandar un pago único y mentir. */}
```

- [ ] **Step 4: Verificar tipos y build**

Run: `cd new-implementation/frontend && npx tsc --noEmit && npm run lint`
Expected: exit 0, sin errores.

- [ ] **Step 5: Commit**

```bash
git add new-implementation/frontend
git commit -m "fix(sales): registrar el pago al cerrar la venta y ocultar Mixed"
```

---

### Task 5: Verificación contra el despliegue

Los tests unitarios prueban la lógica; esto prueba el **cableado**, que es lo único que el transformer de Task 1 no puede demostrar en un unitario.

**Files:**
- Modify: `new-implementation/STAGING-DRY-RUN-RESULTS.md` (acta de la 3ª pasada)
- Modify: `docs/specs/SPEC-BACK-003-sale-checkout-integrity.md` (status line)

- [ ] **Step 1: Desplegar y confirmar el commit**

Redesplegar el recurso en Coolify. En el log, confirmar `Importing … (commit sha <el de Task 4>)`.

- [ ] **Step 2: Comprobar el cableado del transformer**

```bash
curl -s https://facturame-api.automatizate.dev/products -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import json,sys; p=json.load(sys.stdin)['data'][0]; print(type(p['price']).__name__, p['price'])"
```
Expected: `int 25000` o `float 25000.0` — **no** `str`.

- [ ] **Step 3: Correr §4 completo en navegador real**

`STAGING-DRY-RUN.md` §4, items 1 a 5: login, catálogo + producto, venta en ≤4 clics, cliente real con búsqueda por nombre, y reportes reflejando la venta. El criterio de `SPEC-CUT-002` exige navegador, no `curl`.

- [ ] **Step 4: Verificar el estado persistido**

```sql
SELECT order_number, subtotal, tax_amount, total_amount, status, payment_status FROM orders ORDER BY created_at DESC LIMIT 1;
SELECT COUNT(*) FROM payments;
SELECT stock_quantity FROM products WHERE sku = 'DRY001';
SELECT movement_type, quantity, reference_id FROM stock_movements ORDER BY created_at DESC LIMIT 3;
```
Expected: el `total_amount` coincide con lo que mostró la caja; `status = completed`; `payment_status = paid`; una fila en `payments`; el stock bajó por la cantidad vendida; una fila `OUT` en `stock_movements` por ítem.

- [ ] **Step 5: Registrar el resultado**

Añadir el acta de la 3ª pasada a `STAGING-DRY-RUN-RESULTS.md` y actualizar la status line de `SPEC-BACK-003`. **Si §4 pasa entero, el veredicto de `SPEC-CUT-002` sigue siendo del operador** — el acta deja la línea de firma en blanco.

- [ ] **Step 6: Commit**

```bash
git add new-implementation/STAGING-DRY-RUN-RESULTS.md docs/specs
git commit -m "docs(specs): 3ª pasada del dry-run tras cerrar D6/D7/D8"
```
