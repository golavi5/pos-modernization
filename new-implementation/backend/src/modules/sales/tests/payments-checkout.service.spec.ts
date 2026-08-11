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
    // La ubicación debe crearse con el EntityManager de ESTA transacción: si se
    // creara con otro, un rollback no revertiría su escritura.
    expect(locations.ensureDefaultLocation).toHaveBeenCalledWith('c1', manager);
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
