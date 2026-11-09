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
});
