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
import { SalesReportService } from '../src/modules/reports/services/sales-report.service';
import { PeriodType } from '../src/modules/reports/dto/report-query.dto';
import { ProductReportService } from '../src/modules/reports/services/product-report.service';
import { CustomerReportService } from '../src/modules/reports/services/customer-report.service';
import { Customer } from '../src/modules/customers/customer.entity';
import { PaymentsService } from '../src/modules/sales/services/payments.service';
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

    const reports = new SalesReportService(ds.getRepository(Order), ds.getRepository(OrderItem));
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
    );
    const customers = new CustomerReportService(ds.getRepository(Customer), ds.getRepository(Order));

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
});
