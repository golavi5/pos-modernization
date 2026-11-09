/**
 * SPEC-BACK-003 gap (b): the pessimistic lock in `PaymentsService.recordPayment`
 * had only been exercised by unit tests whose mocks ignore `lock`. This runs the
 * real service against a real MySQL 8 and races two full-balance payments.
 *
 * Needs a THROWAWAY database — the schema is dropped on connect:
 *   docker run -d --name pos-lock-test -e MYSQL_ROOT_PASSWORD=locktest \
 *     -e MYSQL_DATABASE=pos_lock_test -p 3319:3306 mysql:8.0
 *   npm run test:e2e
 * The target is hard-coded on purpose: it must never fall back to DB_NAME.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import type { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { BadRequestException } from '@nestjs/common';
import { dataSourceOptions } from '../src/database/data-source';
import { InventoryReportService } from '../src/modules/reports/services/inventory-report.service';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { PaymentsService } from '../src/modules/sales/services/payments.service';
import { ProductsService as RealProductsService } from '../src/modules/products/products.service';
import { StockService } from '../src/modules/inventory/services/stock.service';
import { SalesService } from '../src/modules/sales/services/sales.service';
import { OrderCalculationService } from '../src/modules/sales/services/order-calculation.service';
import { InventoryLocationsService } from '../src/modules/inventory/services/inventory-locations.service';
import { ProductsService } from '../src/modules/products/products.service';
import { Company } from '../src/modules/companies/entities/company.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import {
  Order,
  OrderStatus,
  PaymentStatus as OrderPaymentStatus,
} from '../src/modules/sales/entities/order.entity';
import { OrderItem } from '../src/modules/sales/entities/order-item.entity';
import {
  Payment,
  PaymentMethod,
} from '../src/modules/sales/entities/payment.entity';
import {
  StockMovement,
  MovementType,
} from '../src/modules/inventory/entities/stock-movement.entity';

const ROUNDS = 15;
const START_STOCK = 100;
const TOTAL = 50;

describe('PaymentsService.recordPayment — pessimistic lock (real MySQL)', () => {
  let ds: DataSource;
  let service: PaymentsService;
  let sales: SalesService;
  let stock: StockService;
  let company: Company;
  let user: User;
  let product: Product;

  beforeAll(async () => {
    ds = new DataSource({
      ...(dataSourceOptions as MysqlConnectionOptions),
      host: '127.0.0.1',
      port: 3319,
      username: 'root',
      password: 'locktest',
      database: 'pos_lock_test',
      synchronize: false,
      migrationsRun: true,
      dropSchema: true,
    });
    await ds.initialize();

    // `getOversellPolicy` only reads settings; a fixed policy keeps this test
    // about the lock, not about SettingsService.
    const productsService = {
      getOversellPolicy: async () => ({ allowNegativeStock: false }),
    } as unknown as ProductsService;
    service = new PaymentsService(
      ds.getRepository(Order),
      ds.getRepository(Payment),
      ds,
      new InventoryLocationsService(),
      productsService,
    );

    sales = new SalesService(
      ds.getRepository(Order),
      ds.getRepository(OrderItem),
      {} as unknown as OrderCalculationService,
      productsService,
      ds,
      new InventoryLocationsService(),
    );

    stock = new StockService(
      ds.getRepository(Product),
      ds,
      new InventoryLocationsService(),
    );

    company = await ds.manager.save(
      Company,
      ds.manager.create(Company, { name: 'Lock Test Co' }),
    );
    user = await ds.manager.save(
      User,
      ds.manager.create(User, {
        email: 'cashier@lock.test',
        password_hash: 'x',
        name: 'Cashier',
        company_id: company.id,
      }),
    );
    product = await ds.manager.save(
      Product,
      ds.manager.create(Product, {
        company_id: company.id,
        name: 'Widget',
        sku: 'LOCK-1',
        price: TOTAL,
        stock_quantity: START_STOCK,
        created_by: user.id,
      }),
    );
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  async function seedOrder(n: number): Promise<Order> {
    const order = await ds.manager.save(
      Order,
      ds.manager.create(Order, {
        company_id: company.id,
        order_number: `LOCK-${n}`,
        total_amount: TOTAL,
        status: OrderStatus.PENDING,
        payment_status: OrderPaymentStatus.UNPAID,
        created_by: user.id,
      }),
    );
    await ds.manager.save(
      OrderItem,
      ds.manager.create(OrderItem, {
        order_id: order.id,
        product_id: product.id,
        quantity: 1,
        unit_price: TOTAL,
        subtotal: TOTAL,
        tax_amount: 0,
        total: TOTAL,
      }),
    );
    return order;
  }

  it('two concurrent full-balance payments: exactly one wins, stock leaves once', async () => {
    for (let i = 1; i <= ROUNDS; i++) {
      const order = await seedOrder(i);
      const pay = () =>
        service.recordPayment(
          order.id,
          { payment_method: PaymentMethod.CASH, amount: TOTAL },
          user,
        );

      const results = await Promise.allSettled([pay(), pay()]);

      const ok = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      expect(ok).toHaveLength(1);
      expect(failed).toHaveLength(1);
      // A deadlock or lock-wait timeout must fail here, not count as "the lock worked".
      expect(failed[0].reason).toBeInstanceOf(BadRequestException);
      expect(String(failed[0].reason.message)).toMatch(
        /exceeds remaining balance/,
      );

      expect(
        await ds.manager.count(Payment, { where: { order_id: order.id } }),
      ).toBe(1);
      expect(
        await ds.manager.count(StockMovement, {
          where: { reference_id: order.id, movement_type: MovementType.OUT },
        }),
      ).toBe(1);

      const after = await ds.manager.findOneByOrFail(Order, { id: order.id });
      expect(after.status).toBe(OrderStatus.COMPLETED);
      expect(after.payment_status).toBe(OrderPaymentStatus.PAID);
    }

    const finalProduct = await ds.manager.findOneByOrFail(Product, {
      id: product.id,
    });
    expect(finalProduct.stock_quantity).toBe(START_STOCK - ROUNDS);
  });
  // SPEC-BACK-003 gap (d): `refundPayment` checked "already refunded" on a read
  // OUTSIDE its transaction, so two concurrent refunds both passed and both
  // returned the stock.
  it('two concurrent refunds of the same payment: exactly one wins, stock returns once', async () => {
    const stockOf = async () =>
      (await ds.manager.findOneByOrFail(Product, { id: product.id }))
        .stock_quantity;
    const before = await stockOf();

    for (let i = 1; i <= ROUNDS; i++) {
      const order = await seedOrder(1000 + i);
      const payment = await service.recordPayment(
        order.id,
        { payment_method: PaymentMethod.CASH, amount: TOTAL },
        user,
      );

      const results = await Promise.allSettled([
        service.refundPayment(payment.id, user),
        service.refundPayment(payment.id, user),
      ]);

      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0].reason).toBeInstanceOf(BadRequestException);
      expect(String(failed[0].reason.message)).toMatch(/already refunded/);

      expect(
        await ds.manager.count(StockMovement, {
          where: { reference_id: order.id, movement_type: MovementType.RETURN },
        }),
      ).toBe(1);
      const after = await ds.manager.findOneByOrFail(Order, { id: order.id });
      expect(after.status).toBe(OrderStatus.PENDING);
      expect(after.payment_status).toBe(OrderPaymentStatus.UNPAID);
    }

    // Each round was pay (−1) then refund (+1): the net is zero.
    expect(await stockOf()).toBe(before);
  });
  // SPEC-BACK-007 slice 1. The invariant of every test below: the change in a
  // product's stock equals the signed sum of the movements written for the order.
  const stockOf = async () =>
    (await ds.manager.findOneByOrFail(Product, { id: product.id }))
      .stock_quantity;
  const signedMovements = async (orderId: string) => {
    const rows = await ds.manager.find(StockMovement, {
      where: { reference_id: orderId },
    });
    return rows.reduce(
      (sum, m) =>
        sum +
        (m.movement_type === MovementType.IN ||
        m.movement_type === MovementType.RETURN
          ? m.quantity
          : -m.quantity),
      0,
    );
  };
  const confirm = (orderId: string) =>
    sales.updateOrderStatus(orderId, { status: OrderStatus.CONFIRMED }, user);
  const voidOrder = (orderId: string) =>
    sales.updateOrderStatus(orderId, { status: OrderStatus.VOIDED }, user);

  it('two concurrent confirms: exactly one wins, one OUT, stock leaves once', async () => {
    for (let i = 1; i <= ROUNDS; i++) {
      const order = await seedOrder(2000 + i);
      const before = await stockOf();

      const results = await Promise.allSettled([
        confirm(order.id),
        confirm(order.id),
      ]);

      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0].reason).toBeInstanceOf(BadRequestException);
      expect(String(failed[0].reason.message)).toMatch(/Cannot transition/);

      expect(await signedMovements(order.id)).toBe(-1);
      expect(await stockOf()).toBe(before - 1);
    }
  });

  it('voiding a confirmed order returns its stock exactly once', async () => {
    for (let i = 1; i <= ROUNDS; i++) {
      const order = await seedOrder(3000 + i);
      const before = await stockOf();
      await confirm(order.id);
      expect(await stockOf()).toBe(before - 1);

      const results = await Promise.allSettled([
        voidOrder(order.id),
        voidOrder(order.id),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
      expect(await signedMovements(order.id)).toBe(0);
      expect(await stockOf()).toBe(before);
    }
  });

  it('a sale confirmed, then paid, can be refunded: no double deduct, stock returns', async () => {
    const order = await seedOrder(4000);
    const before = await stockOf();
    await confirm(order.id);
    const payment = await service.recordPayment(
      order.id,
      { payment_method: PaymentMethod.CASH, amount: TOTAL },
      user,
    );
    // confirmed → paid must not deduct a second time
    expect(await stockOf()).toBe(before - 1);

    await service.refundPayment(payment.id, user);

    expect(await stockOf()).toBe(before);
    expect(await signedMovements(order.id)).toBe(0);
    const after = await ds.manager.findOneByOrFail(Order, { id: order.id });
    expect(after.status).toBe(OrderStatus.PENDING);
  });
  // SPEC-BACK-007 slice 2: manual adjustments go through `products.stock_quantity`
  // and the journal, under the same product lock.
  it('adjusts of every type: stock moves by the signed sum of the journal', async () => {
    const before = await stockOf();
    const marker = `ADJ-${Date.now()}`;
    const run = (movement_type: MovementType, quantity: number) =>
      stock.adjustStock(
        { product_id: product.id, movement_type, quantity, reference_id: marker },
        user,
      );

    await run(MovementType.IN, 10);
    await run(MovementType.OUT, 3);
    await run(MovementType.ADJUST, 2);
    await run(MovementType.DAMAGE, 1);
    await run(MovementType.RETURN, 4);

    expect(await signedMovements(marker)).toBe(10 - 3 - 2 - 1 + 4);
    expect(await stockOf()).toBe(before + 10 - 3 - 2 - 1 + 4);
  });

  it('two concurrent decrements of the whole stock: one wins, the other is rejected, never below zero', async () => {
    const solo = await ds.manager.save(
      Product,
      ds.manager.create(Product, {
        company_id: company.id,
        name: 'Solo',
        sku: `SOLO-${Date.now()}`,
        price: TOTAL,
        stock_quantity: 5,
        created_by: user.id,
      }),
    );
    const take = () =>
      stock.adjustStock(
        { product_id: solo.id, movement_type: MovementType.OUT, quantity: 5 },
        user,
      );

    const results = await Promise.allSettled([take(), take()]);

    const failed = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].reason).toBeInstanceOf(BadRequestException);
    expect(
      (await ds.manager.findOneByOrFail(Product, { id: solo.id })).stock_quantity,
    ).toBe(0);
    expect(
      await ds.manager.count(StockMovement, { where: { product_id: solo.id } }),
    ).toBe(1);
  });
  // SPEC-BACK-007 slice 3: the initial stock of a new product is a journaled IN.
  it('creating a product with initial stock journals it: stock equals the signed sum', async () => {
    const products = new RealProductsService(
      ds.getRepository(Product),
      { getSettings: async () => ({ allowNegativeStock: false }) } as never,
      ds,
      new InventoryLocationsService(),
    );
    const created = await products.create(
      { name: 'Nuevo', sku: `NEW-${Date.now()}`, price: TOTAL, stock_quantity: 7, tax_rate: 19 } as never,
      user,
    );

    const row = await ds.manager.findOneByOrFail(Product, { id: created.id });
    expect(row.stock_quantity).toBe(7);
    const journal = await ds.manager.find(StockMovement, { where: { product_id: created.id } });
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ movement_type: MovementType.IN, quantity: 7, notes: 'Stock inicial' });
  });
  // The inventory value report used to return hardcoded zeros.
  it('inventory value report: stock at cost against the default warehouse, oversold counted as 0', async () => {
    const valueCo = await ds.manager.save(Company, ds.manager.create(Company, { name: 'Value Co' }));
    const mk = (sku: string, stock: number, cost: number | null) =>
      ds.manager.save(
        Product,
        ds.manager.create(Product, {
          company_id: valueCo.id, name: sku, sku: `${sku}-${Date.now()}`, price: 1, cost, stock_quantity: stock, created_by: user.id,
        } as Product),
      );
    await mk('A', 10, 5);
    await mk('B', 3, 2);
    await mk('C', -4, 100); // oversold: worth nothing
    await mk('D', 0, 9);
    const report = new InventoryReportService(
      ds.getRepository(StockMovement), ds.getRepository(Warehouse), ds.getRepository(Product),
    );
    const totals = { productCount: 2, totalUnits: 13, totalValue: 56 };

    // No warehouse yet (nothing sold): one default row.
    expect(await report.getInventoryValueByWarehouse(valueCo.id)).toEqual([
      { warehouseId: null, warehouseName: 'Principal', ...totals },
    ]);

    // Two warehouses: the oldest carries the stock, the other is listed with zeros.
    const first = await ds.manager.save(Warehouse, ds.manager.create(Warehouse, { company_id: valueCo.id, name: 'Central', is_active: true }));
    await new Promise((r) => setTimeout(r, 1100));
    const second = await ds.manager.save(Warehouse, ds.manager.create(Warehouse, { company_id: valueCo.id, name: 'Sucursal', is_active: true }));
    expect(await report.getInventoryValueByWarehouse(valueCo.id)).toEqual([
      { warehouseId: first.id, warehouseName: 'Central', ...totals },
      { warehouseId: second.id, warehouseName: 'Sucursal', productCount: 0, totalUnits: 0, totalValue: 0 },
    ]);
  // A DB-generated timestamp (CURRENT_TIMESTAMP, UTC in the MySQL container)
  // must read back as the same instant whatever timezone the Node host is in.
  // test/set-tz.js runs this whole suite as a UTC−5 host: with the driver's
  // default `timezone: 'local'` every created_at read 5 hours off and the
  // reports' date windows matched nothing.
  it('created_at round-trips as the same instant on a non-UTC host', async () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(300);
    const order = await seedOrder(5000);

    const row = await ds.manager.findOneByOrFail(Order, { id: order.id });

    expect(Math.abs(row.created_at.getTime() - Date.now())).toBeLessThan(60_000);
  });
});
