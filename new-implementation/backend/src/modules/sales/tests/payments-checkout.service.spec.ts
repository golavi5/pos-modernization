import 'reflect-metadata';
import { PaymentsService } from '../services/payments.service';
import { OrderStatus, PaymentStatus as OrderPaymentStatus } from '../entities/order.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
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
  let productsService: any;
  let inserted: any[];
  let priorPayments: any[];
  let priorMovements: any[];

  beforeEach(() => {
    inserted = [];
    priorPayments = [];
    priorMovements = [];
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
      // `priorPayments` / `priorMovements` son lo que la transacción ve al
      // releer: es donde se simula el estado que otra transacción ya comprometió.
      find: jest.fn(async (entity: any) =>
        entity === Payment ? priorPayments : entity === StockMovement ? priorMovements : [],
      ),
      save: jest.fn(async (_e: any, obj: any) => obj),
      create: jest.fn((_e: any, obj: any) => obj),
      insert: jest.fn(async (entity: any, obj: any) => { inserted.push({ entity, obj }); }),
    };
    dataSource = { transaction: jest.fn(async (cb: any) => cb(manager)) };
    locations = { ensureDefaultLocation: jest.fn(async () => 'loc1') };
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
    priorPayments = [{ amount: 29750, status: PaymentStatus.COMPLETED }];
    order.total_amount = 40000; // deja saldo, para que el pago sea admisible

    await service.recordPayment('o1', { payment_method: 'cash', amount: 10250 } as any, USER);

    expect(product.stock_quantity).toBe(50);
    expect(inserted).toHaveLength(0);
  });

  // 🔴 CRITICAL de la revisión: `updateOrderStatus` ya descuenta al pasar a
  // CONFIRMED (`productsService.deductStock`), y CONFIRMED → COMPLETED es una
  // transición válida. Sin esta guarda, cobrar un pedido confirmado descontaba
  // el stock por segunda vez.
  it('pedido CONFIRMED (ya descontado al confirmar): cobra y cierra, pero NO descuenta otra vez', async () => {
    order.status = OrderStatus.CONFIRMED;
    order.payment_status = OrderPaymentStatus.UNPAID;

    await service.recordPayment('o1', { payment_method: 'card', amount: 29750 } as any, USER);

    expect(order.payment_status).toBe(OrderPaymentStatus.PAID);
    expect(order.status).toBe(OrderStatus.COMPLETED); // la venta sí se cierra
    expect(product.stock_quantity).toBe(50); // pero el stock ya lo descontó `confirmed`
    expect(inserted).toHaveLength(0);
    expect(locations.ensureDefaultLocation).not.toHaveBeenCalled();
  });

  // 🟠 IMPORTANT de la revisión: dos pagos totales concurrentes. El segundo
  // entra con una lectura RANCIA (su `order` externo aún dice DRAFT/UNPAID y
  // sin pagos), pero al releer DENTRO de la transacción ve lo que el primero ya
  // comprometió y debe rechazarse en vez de descontar otra vez.
  it('pago concurrente: la relectura dentro de la transacción rechaza el segundo pago total', async () => {
    // Estado externo rancio: el pedido parece impagado y en borrador.
    expect(order.status).toBe(OrderStatus.DRAFT);
    expect(order.payments).toHaveLength(0);
    // Lo que la otra transacción ya comprometió:
    priorPayments = [{ amount: 29750, status: PaymentStatus.COMPLETED }];

    await expect(
      service.recordPayment('o1', { payment_method: 'card', amount: 29750 } as any, USER),
    ).rejects.toThrow(/exceeds remaining balance/i);

    // El rechazo viene de DENTRO: con la lectura externa el saldo daba 29750 y
    // el chequeo previo lo dejó pasar, así que la transacción llegó a abrirse.
    expect(dataSource.transaction).toHaveBeenCalled();
    expect(manager.find).toHaveBeenCalled();
    expect(product.stock_quantity).toBe(50);
    expect(inserted).toHaveLength(0);
  });

  it('los pagos reembolsados no cuentan para el saldo: se puede volver a cobrar', async () => {
    priorPayments = [{ amount: 29750, status: PaymentStatus.REFUNDED }];

    await service.recordPayment('o1', { payment_method: 'cash', amount: 29750 } as any, USER);

    expect(order.payment_status).toBe(OrderPaymentStatus.PAID);
    expect(product.stock_quantity).toBe(48);
  });

  it('sin stock suficiente: lanza y no deja el pedido completado', async () => {
    product.stock_quantity = 1;

    await expect(
      service.recordPayment('o1', { payment_method: 'card', amount: 29750 } as any, USER),
    ).rejects.toThrow(/stock/i);

    expect(order.status).not.toBe(OrderStatus.COMPLETED);
  });

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

    // La política debe resolverse UNA vez por cobro, no una vez por ítem: si se
    // moviera dentro del `for`, un pedido con 3 líneas dispararía 3 llamadas.
    it('resuelve la política de sobreventa una sola vez, aunque el pedido tenga varios ítems', async () => {
      order.order_items = [
        { product_id: 'p1', quantity: 1 },
        { product_id: 'p2', quantity: 1 },
        { product_id: 'p3', quantity: 1 },
      ];

      await service.recordPayment('o1', { payment_method: 'cash', amount: 29750 } as any, USER);

      expect(productsService.getOversellPolicy).toHaveBeenCalledTimes(1);
    });
  });
});

// 🟠 IMPORTANT de la revisión: sin esto, un reembolso dejaba el inventario
// corto y el pedido clavado en `completed` para siempre.
describe('refundPayment — deshacer el cierre de venta', () => {
  const USER = { id: 'u1', company_id: 'c1' } as any;
  let service: PaymentsService;
  let order: any;
  let product: any;
  let payment: any;
  let manager: any;
  let inserted: any[];
  let priorPayments: any[];
  let priorMovements: any[];

  beforeEach(() => {
    inserted = [];
    priorPayments = [];
    priorMovements = [];
    order = {
      id: 'o1',
      order_number: 'ORD1',
      company_id: 'c1',
      total_amount: 29750,
      status: OrderStatus.COMPLETED,
      payment_status: OrderPaymentStatus.PAID,
    };
    product = { id: 'p1', company_id: 'c1', name: 'Café', stock_quantity: 48 };
    payment = { id: 'pay1', order_id: 'o1', amount: 29750, status: PaymentStatus.COMPLETED, order };

    manager = {
      findOne: jest.fn(async (entity: any) => (entity === Product ? product : order)),
      find: jest.fn(async (entity: any) =>
        entity === Payment ? priorPayments : entity === StockMovement ? priorMovements : [],
      ),
      save: jest.fn(async (_e: any, obj: any) => obj),
      create: jest.fn((_e: any, obj: any) => obj),
      insert: jest.fn(async (entity: any, obj: any) => { inserted.push({ entity, obj }); }),
    };

    service = new PaymentsService(
      { findOne: jest.fn(async () => order), save: jest.fn(async (o: any) => o) } as any,
      { findOne: jest.fn(async () => payment), save: jest.fn(async (p: any) => p), find: jest.fn(async () => priorPayments) } as any,
      { transaction: jest.fn(async (cb: any) => cb(manager)) } as any,
      { ensureDefaultLocation: jest.fn(async () => 'loc1') } as any,
      // refundPayment no consulta la política de sobreventa; está aquí porque el
      // constructor lo pide.
      {} as any,
    );
  });

  it('con rastro de movimientos: devuelve el stock, deja RETURN y reabre el pedido', async () => {
    priorMovements = [
      { product_id: 'p1', quantity: 2, location_id: 'loc1', movement_type: MovementType.OUT },
    ];

    await service.refundPayment('pay1', USER);

    expect(product.stock_quantity).toBe(50); // devuelto
    expect(order.payment_status).toBe(OrderPaymentStatus.UNPAID);
    expect(order.status).toBe(OrderStatus.PENDING); // ya no está clavado en completed
    const mov = inserted.find((i) => i.entity === StockMovement);
    expect(mov).toBeDefined();
    expect(mov.obj.movement_type).toBe(MovementType.RETURN);
    expect(mov.obj.quantity).toBe(2);
    expect(mov.obj.reference_id).toBe('o1');
    expect(mov.obj.location_id).toBe('loc1');
  });

  it('sin rastro (descontado por la vía confirmed): no toca el stock y vuelve a CONFIRMED', async () => {
    priorMovements = [];

    await service.refundPayment('pay1', USER);

    expect(product.stock_quantity).toBe(48); // el descuento no era nuestro: no se revierte
    expect(order.status).toBe(OrderStatus.CONFIRMED);
    expect(inserted).toHaveLength(0);
  });

  // Tras un reembolso el pedido se puede volver a cobrar (y a descontar), así
  // que en el trazo pueden convivir varios OUT. Se devuelve el NETO, no la suma.
  it('ciclo cobro → reembolso → cobro → reembolso: devuelve el neto, no el doble', async () => {
    priorMovements = [
      { product_id: 'p1', quantity: 2, location_id: 'loc1', movement_type: MovementType.OUT },
      { product_id: 'p1', quantity: 2, location_id: 'loc1', movement_type: MovementType.RETURN },
      { product_id: 'p1', quantity: 2, location_id: 'loc1', movement_type: MovementType.OUT },
    ];

    await service.refundPayment('pay1', USER);

    expect(product.stock_quantity).toBe(50); // 48 + 2, NO 48 + 4
    const returns = inserted.filter((i) => i.obj.movement_type === MovementType.RETURN);
    expect(returns).toHaveLength(1);
    expect(returns[0].obj.quantity).toBe(2);
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  // Rama defensiva: hay rastro pero el neto ya está en 0 (el stock se devolvió
  // antes). No se devuelve nada de nuevo, y el pedido queda como NO descontado.
  it('con rastro pero neto 0: no vuelve a devolver stock y queda en PENDING', async () => {
    priorMovements = [
      { product_id: 'p1', quantity: 2, location_id: 'loc1', movement_type: MovementType.OUT },
      { product_id: 'p1', quantity: 2, location_id: 'loc1', movement_type: MovementType.RETURN },
    ];

    await service.refundPayment('pay1', USER);

    expect(product.stock_quantity).toBe(48); // intacto
    expect(inserted).toHaveLength(0);
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('reembolso parcial que deja el pedido pagado: no revierte nada', async () => {
    order.total_amount = 10000;
    priorPayments = [{ amount: 10000, status: PaymentStatus.COMPLETED }];
    priorMovements = [
      { product_id: 'p1', quantity: 2, location_id: 'loc1', movement_type: MovementType.OUT },
    ];

    await service.refundPayment('pay1', USER);

    expect(order.payment_status).toBe(OrderPaymentStatus.PAID);
    expect(order.status).toBe(OrderStatus.COMPLETED);
    expect(product.stock_quantity).toBe(48);
    expect(inserted).toHaveLength(0);
  });
});
