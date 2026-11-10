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
import { SettingsService } from '../src/modules/settings/services/settings.service';
import { Settings } from '../src/modules/settings/entities/settings.entity';
import { SalesController } from '../src/modules/sales/sales.controller';
import { SalesReportService } from '../src/modules/reports/services/sales-report.service';
import { PeriodType } from '../src/modules/reports/dto/report-query.dto';
import { ProductReportService } from '../src/modules/reports/services/product-report.service';
import { CustomerReportService } from '../src/modules/reports/services/customer-report.service';
import { Customer } from '../src/modules/customers/customer.entity';
import { PaymentsService } from '../src/modules/sales/services/payments.service';
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
  PaymentStatus as PayStatus,
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
    const products = new ProductsService(
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
  });

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

  // The product list search promises name, SKU and barcode.
  it('product search matches name, SKU and barcode, scoped to the company', async () => {
    const products = new ProductsService(
      ds.getRepository(Product),
      { getSettings: async () => ({ allowNegativeStock: false }) } as never,
      ds,
      new InventoryLocationsService(),
    );
    const tag = `SRCH${Date.now()}`;
    const mk = (over: Partial<Product>) =>
      ds.manager.save(
        Product,
        ds.manager.create(Product, {
          company_id: company.id, price: 1, stock_quantity: 1, created_by: user.id, ...over,
        } as Product),
      );
    await mk({ name: `${tag} by name`, sku: `${tag}-A` });
    await mk({ name: 'plain', sku: `${tag}-SKU` });
    await mk({ name: 'other', sku: `${tag}-B`, barcode: `${tag}7790001` });
    // Another company's product with the same term must never show up.
    const other = await ds.manager.save(Company, ds.manager.create(Company, { name: 'Other Co' }));
    await mk({ company_id: other.id, name: `${tag} foreign`, sku: `${tag}-FOREIGN` } as Partial<Product>);

    const found = async (search: string) =>
      (await products.findAll(user, { search, offset: 0, limit: 50 } as never)).data.map((p) => p.sku).sort();

    expect(await found(`${tag} by name`)).toEqual([`${tag}-A`]);
    expect(await found('SKU')).toEqual(expect.arrayContaining([`${tag}-SKU`]));
    expect(await found(`${tag}7790001`)).toEqual([`${tag}-B`]);
    expect(await found(tag)).toEqual([`${tag}-A`, `${tag}-B`, `${tag}-SKU`]);
  });

  // Sales reports count revenue: completed orders, and payments that were kept.
  it('sales reports ignore draft/pending/cancelled orders and refunded payments', async () => {
    const reportCo = await ds.manager.save(Company, ds.manager.create(Company, { name: 'Report Co' }));
    const order = (n: string, total: number, status: OrderStatus) =>
      ds.manager.save(
        Order,
        ds.manager.create(Order, {
          company_id: reportCo.id, order_number: `RPT-${n}-${Date.now()}`, total_amount: total,
          status, payment_status: OrderPaymentStatus.UNPAID, created_by: user.id,
        }),
      );
    const pay = (o: Order, method: PaymentMethod, amount: number, status: PayStatus) =>
      ds.manager.save(
        Payment,
        ds.manager.create(Payment, { order_id: o.id, payment_method: method, amount, status, payment_date: new Date() }),
      );
    const o1 = await order('1', 100, OrderStatus.COMPLETED);
    const o2 = await order('2', 50, OrderStatus.COMPLETED);
    await order('3', 30, OrderStatus.PENDING);
    await order('4', 20, OrderStatus.CANCELLED);
    await pay(o1, PaymentMethod.CASH, 100, PayStatus.COMPLETED);
    await pay(o2, PaymentMethod.CARD, 30, PayStatus.COMPLETED);
    await pay(o2, PaymentMethod.CARD, 20, PayStatus.REFUNDED);

    const reports = new SalesReportService(
      ds.getRepository(Order),
      ds.getRepository(OrderItem),
      { getSettings: async () => ({ timezone: 'UTC' }) } as never,
    );
    const range = { startDate: new Date(Date.now() - 86_400_000).toISOString(), endDate: new Date(Date.now() + 86_400_000).toISOString() };

    const summary = await reports.getSalesSummary(reportCo.id, { period: PeriodType.MONTHLY, ...range });
    expect(summary.totalSales).toBe(2);
    expect(summary.totalRevenue).toBe(150);

    const byPeriod = await reports.getSalesByPeriod(reportCo.id, { period: PeriodType.DAILY, ...range });
    expect(byPeriod.periodData.reduce((n, r) => n + r.totalSales, 0)).toBe(2);
    expect(byPeriod.periodData.reduce((n, r) => n + r.totalRevenue, 0)).toBe(150);

    const trends = await reports.getRevenueTrends(reportCo.id, { period: PeriodType.DAILY, ...range });
    const byMethod = Object.fromEntries(trends.byPaymentMethod.map((m) => [m.paymentMethod, m.totalRevenue]));
    expect(byMethod).toEqual({ cash: 100, card: 30 });
  });
  // Product and customer reports: only completed orders count as sold / purchases.
  it('product and customer reports ignore cancelled and pending orders', async () => {
    const co = await ds.manager.save(Company, ds.manager.create(Company, { name: 'Rep2 Co' }));
    const prod = await ds.manager.save(
      Product,
      ds.manager.create(Product, { company_id: co.id, name: 'Reportable', sku: `REP-${Date.now()}`, price: 10, stock_quantity: 50, created_by: user.id }),
    );
    const cust = await ds.manager.save(
      Customer,
      ds.manager.create(Customer, { company_id: co.id, name: 'Buyer', email: `buyer${Date.now()}@example.com` }),
    );
    const sell = async (n: string, status: OrderStatus, qty: number, total: number) => {
      const o = await ds.manager.save(
        Order,
        ds.manager.create(Order, {
          company_id: co.id, customer_id: cust.id, order_number: `R2-${n}-${Date.now()}`, total_amount: total,
          status, payment_status: OrderPaymentStatus.UNPAID, created_by: user.id,
        }),
      );
      await ds.manager.save(
        OrderItem,
        ds.manager.create(OrderItem, { order_id: o.id, product_id: prod.id, quantity: qty, unit_price: 10, subtotal: qty * 10, tax_amount: 0, total: qty * 10 }),
      );
    };
    await sell('1', OrderStatus.COMPLETED, 2, 100);
    await sell('2', OrderStatus.CANCELLED, 5, 900);
    await sell('3', OrderStatus.PENDING, 7, 40);

    const range = { startDate: new Date(Date.now() - 86_400_000).toISOString(), endDate: new Date(Date.now() + 86_400_000).toISOString() };
    const products = new ProductReportService(
      ds.getRepository(Product), ds.getRepository(OrderItem), ds.getRepository(Order), ds.getRepository(StockMovement),
      { getSettings: async () => ({ timezone: 'UTC' }) } as never,
    );
    const customers = new CustomerReportService(
      ds.getRepository(Customer), ds.getRepository(Order), { getSettings: async () => ({ timezone: 'UTC' }) } as never,
    );

    const top = await products.getTopSellingProducts(co.id, range);
    expect(top).toHaveLength(1);
    expect(top[0].totalQuantitySold).toBe(2);
    expect(top[0].totalRevenue).toBe(20);

    const turnover = await products.getInventoryTurnover(co.id, range);
    expect(turnover.turnover[0].totalSold).toBe(2);

    const buyers = await customers.getTopCustomers(co.id, range);
    expect(buyers).toHaveLength(1);
    expect(buyers[0].totalPurchases).toBe(1);
    expect(buyers[0].totalSpent).toBe(100);

    const report = await customers.getCustomerReport(co.id, range);
    expect(report.segments.reduce((n, g) => n + g.totalRevenue, 0)).toBe(100);
    expect(report.activeCustomers).toBe(1);
  });
  // SPEC-BACK-008: "a day" is a calendar day in the company's timezone.
  it('report days follow the company timezone (bars and the dashboard "today")', async () => {
    const tzCo = await ds.manager.save(Company, ds.manager.create(Company, { name: 'TZ Co' }));
    const settings = new SettingsService(ds.getRepository(Settings));
    const mkOrder = async (n: string, utc: string) => {
      const o = await ds.manager.save(
        Order,
        ds.manager.create(Order, {
          company_id: tzCo.id, order_number: `TZ-${n}-${Date.now()}`, total_amount: 100,
          status: OrderStatus.COMPLETED, payment_status: OrderPaymentStatus.PAID, created_by: user.id,
        }),
      );
      // Raw SQL: the connection runs in UTC ('Z'), so this stores exactly this instant.
      // (`order_date` is what the daily endpoint filters on; for real sales it equals created_at.)
      await ds.query('UPDATE orders SET created_at = ?, order_date = ? WHERE id = ?', [utc, utc, o.id]);
    };
    await mkOrder('a', '2026-11-10 01:00:00.000000'); // 20:00 on the 9th in Bogotá
    await mkOrder('b', '2026-11-10 06:00:00.000000'); // 01:00 on the 10th in Bogotá

    const reports = new SalesReportService(ds.getRepository(Order), ds.getRepository(OrderItem), settings);
    const range = { period: PeriodType.DAILY, startDate: '2026-11-08T00:00:00.000Z', endDate: '2026-11-11T12:00:00.000Z' };
    const bars = async () =>
      Object.fromEntries((await reports.getSalesByPeriod(tzCo.id, range)).periodData.map((r) => [r.date, r.totalSales]));
    const controller = new SalesController(sales, {} as never, settings);
    const caller = { ...user, company_id: tzCo.id } as typeof user;
    const todayOrders = async (date: string) => (await controller.getDailySalesReport(caller, date)).total_orders;

    // The default (a new settings row) is America/Bogota: the 20:00 sale is the 9th's.
    expect((await settings.getSettings(tzCo.id)).timezone).toBe('America/Bogota');
    expect(await bars()).toEqual({ '2026-11-09': 1, '2026-11-10': 1 });
    expect(await todayOrders('2026-11-09')).toBe(1);
    expect(await todayOrders('2026-11-10')).toBe(1);

    // UTC: both sales fall on the 10th.
    await settings.updateCompany(tzCo.id, { timezone: 'UTC' });
    expect(await bars()).toEqual({ '2026-11-10': 2 });
    expect(await todayOrders('2026-11-09')).toBe(0);
    expect(await todayOrders('2026-11-10')).toBe(2);

    // UTC+9 (positive offset): 10:00 and 15:00 on the 10th.
    await settings.updateCompany(tzCo.id, { timezone: 'Asia/Tokyo' });
    expect(await bars()).toEqual({ '2026-11-10': 2 });
  });
  // by-period bucketing for every period type (the daily case is covered by the
  // timezone test above); the expected keys come from an independent ISO-week
  // computation, not from the SQL under test.
  it('by-period buckets weekly (ISO), monthly and yearly correctly under MySQL 8 strict mode', async () => {
    const co = await ds.manager.save(Company, ds.manager.create(Company, { name: 'Periods Co' }));
    // 2025-12-29 (Mon) and 2026-01-01 (Thu) are both ISO week 2026-W01: that is where
    // `%x-W%v` (ISO) and the tempting `%Y-W%u` disagree.
    const days = ['2025-12-29', '2026-01-01', '2026-10-31', '2026-11-09', '2026-11-10', '2026-11-16'];
    for (const [i, day] of days.entries()) {
      const o = await ds.manager.save(
        Order,
        ds.manager.create(Order, {
          company_id: co.id, order_number: `PER-${i}-${Date.now()}`, total_amount: 10,
          status: OrderStatus.COMPLETED, payment_status: OrderPaymentStatus.PAID, created_by: user.id,
        }),
      );
      await ds.query('UPDATE orders SET created_at = ? WHERE id = ?', [`${day} 12:00:00.000000`, o.id]);
    }
    const isoWeek = (day: string) => {
      const d = new Date(`${day}T12:00:00Z`);
      const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
      d.setUTCDate(d.getUTCDate() - dow + 3); // the Thursday of this ISO week
      const year = d.getUTCFullYear();
      const jan4 = new Date(Date.UTC(year, 0, 4));
      const week = 1 + Math.round(((d.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
      return `${year}-W${String(week).padStart(2, '0')}`;
    };
    const count = (keys: string[]) => keys.reduce<Record<string, number>>((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), {});

    const reports = new SalesReportService(
      ds.getRepository(Order), ds.getRepository(OrderItem), { getSettings: async () => ({ timezone: 'UTC' }) } as never,
    );
    const range = { startDate: '2025-12-01T00:00:00.000Z', endDate: '2026-12-01T00:00:00.000Z' };
    const buckets = async (period: PeriodType) =>
      Object.fromEntries((await reports.getSalesByPeriod(co.id, { period, ...range })).periodData.map((r) => [r.date, r.totalSales]));

    expect(await buckets(PeriodType.WEEKLY)).toEqual(count(days.map(isoWeek)));
    expect(await buckets(PeriodType.MONTHLY)).toEqual({ '2025-12': 1, '2026-01': 1, '2026-10': 1, '2026-11': 3 });
    expect(await buckets(PeriodType.YEARLY)).toEqual({ '2025': 1, '2026': 5 });
  });
  // The Reports page has a period selector on the Products and Customers tabs; the
  // backend used to ignore it and always return the last month.
  it('product and customer reports honor the period selector', async () => {
    const co = await ds.manager.save(Company, ds.manager.create(Company, { name: 'Period2 Co' }));
    const prod = await ds.manager.save(
      Product,
      ds.manager.create(Product, { company_id: co.id, name: 'Periodic', sku: `PRD-${Date.now()}`, price: 10, stock_quantity: 50, created_by: user.id }),
    );
    const cust = await ds.manager.save(
      Customer,
      ds.manager.create(Customer, { company_id: co.id, name: 'Periodic Buyer', email: `periodic${Date.now()}@example.com` }),
    );
    const sell = async (n: string, qty: number, daysAgo: number) => {
      const o = await ds.manager.save(
        Order,
        ds.manager.create(Order, {
          company_id: co.id, customer_id: cust.id, order_number: `PD-${n}-${Date.now()}`, total_amount: qty * 10,
          status: OrderStatus.COMPLETED, payment_status: OrderPaymentStatus.PAID, created_by: user.id,
        }),
      );
      await ds.manager.save(
        OrderItem,
        ds.manager.create(OrderItem, { order_id: o.id, product_id: prod.id, quantity: qty, unit_price: 10, subtotal: qty * 10, tax_amount: 0, total: qty * 10 }),
      );
      if (daysAgo) {
        await ds.query('UPDATE orders SET created_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY) WHERE id = ?', [daysAgo, o.id]);
      }
    };
    await sell('today', 1, 0);
    await sell('old', 3, 40);

    const settings = { getSettings: async () => ({ timezone: 'UTC' }) } as never;
    const products = new ProductReportService(
      ds.getRepository(Product), ds.getRepository(OrderItem), ds.getRepository(Order), ds.getRepository(StockMovement), settings,
    );
    const customers = new CustomerReportService(ds.getRepository(Customer), ds.getRepository(Order), settings);
    const sold = async (period: PeriodType) => (await products.getTopSellingProducts(co.id, { period }))[0]?.totalQuantitySold;
    const bought = async (period: PeriodType) => (await customers.getTopCustomers(co.id, { period }))[0]?.totalPurchases;

    expect(await sold(PeriodType.DAILY)).toBe(1);
    expect(await sold(PeriodType.MONTHLY)).toBe(1); // 40 days ago is outside the last month
    expect(await sold(PeriodType.YEARLY)).toBe(4);
    expect(await bought(PeriodType.DAILY)).toBe(1);
    expect(await bought(PeriodType.YEARLY)).toBe(2);
  });
});
