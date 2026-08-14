import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import {
  Order,
  OrderStatus,
  PaymentStatus as OrderPaymentStatus,
} from '../entities/order.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { User } from '../../auth/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import {
  StockMovement,
  MovementType,
} from '../../inventory/entities/stock-movement.entity';
import { InventoryLocationsService } from '../../inventory/services/inventory-locations.service';
import { ProductsService } from '../../products/products.service';
import { canSellWithoutStock } from '../../products/can-sell-without-stock';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly locations: InventoryLocationsService,
    private readonly productsService: ProductsService,
  ) {}

  async recordPayment(
    orderId: string,
    dto: CreatePaymentDto,
    user: User,
  ): Promise<Payment> {
    // Get order and verify ownership
    const order = await this.orderRepository.findOne({
      where: { id: orderId, company_id: user.company_id },
      relations: ['payments', 'order_items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Validate payment amount
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Los ítems salen de ESTA lectura: la relectura bloqueante de dentro de la
    // transacción omite `relations` a propósito, así que su `order_items`
    // vendría vacío y no se descontaría nada.
    const items = order.order_items ?? [];

    // Chequeo rápido para fallar antes de abrir transacción. El autoritativo es
    // el de dentro, que recalcula sobre filas bloqueadas.
    const totalPaidSoFar = (order.payments || [])
      .filter((p) => p.status !== PaymentStatus.REFUNDED)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingBalance = Number(order.total_amount) - totalPaidSoFar;

    if (dto.amount > remainingBalance) {
      throw new BadRequestException(
        `Payment amount ${dto.amount} exceeds remaining balance ${remainingBalance}`,
      );
    }

    // Se resuelve fuera de la transacción, ANTES de abrirla: `getOversellPolicy`
    // llega a `SettingsService`, que consulta contra el `DataSource` (no contra
    // `manager`) y por tanto abre su propia conexión del pool. Hacerlo mientras
    // la transacción de abajo ya sostiene una conexión y un `pessimistic_write`
    // sobre el pedido (y, a partir de la segunda vuelta del bucle, sobre
    // productos) puede agotar el pool bajo concurrencia: no hay `extra` de pool
    // configurado, así que mysql2 usa sus valores por defecto
    // (`connectionLimit: 10`, `waitForConnections: true`, `queueLimit: 0` — cola
    // sin límite y sin timeout de adquisición), y diez cobros concurrentes
    // bastan para dejarlos a todos esperando una conexión que nadie libera.
    // También evita una segunda causa del mismo bug: `getSettings` inserta la
    // fila de settings si la empresa no tiene una, y hacerlo en una conexión
    // fuera de esta transacción deja esa inserción vulnerable a una carrera con
    // otro cobro concurrente (duplicado sobre `idx_settings_company`).
    // Depende solo de `order.company_id`, que ya tenemos de la lectura de
    // arriba (la misma empresa que `locked.company_id` dentro de la
    // transacción, porque la relectura busca por el mismo `orderId` +
    // `company_id`).
    const policy = await this.productsService.getOversellPolicy(
      order.company_id,
    );

    const savedPayment = await this.dataSource.transaction(async (manager) => {
      // Lectura BLOQUEANTE del pedido: serializa los pagos concurrentes sobre el
      // mismo pedido y, en InnoDB, devuelve la última fila comprometida — no el
      // snapshot REPEATABLE READ. Todo lo que decide el descuento se calcula a
      // partir de aquí, no de la lectura de fuera, que puede estar rancia.
      const locked = await manager.findOne(Order, {
        where: { id: orderId, company_id: user.company_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!locked) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Saldo recalculado DENTRO de la transacción: dos pagos totales
      // simultáneos ya no pueden pasar los dos la validación. Los reembolsados
      // no cuentan (si no, tras un reembolso el saldo nunca se recupera y el
      // pedido no se puede volver a cerrar).
      const priorPayments =
        (await manager.find(Payment, { where: { order_id: orderId } })) ?? [];
      const totalPaid = priorPayments
        .filter((p) => p.status !== PaymentStatus.REFUNDED)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      if (dto.amount > Number(locked.total_amount) - totalPaid) {
        throw new BadRequestException(
          `Payment amount ${dto.amount} exceeds remaining balance ${
            Number(locked.total_amount) - totalPaid
          }`,
        );
      }

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
      if (newTotalPaid >= Number(locked.total_amount)) {
        locked.payment_status = OrderPaymentStatus.PAID;
      } else if (newTotalPaid > 0) {
        locked.payment_status = OrderPaymentStatus.PARTIALLY_PAID;
      }

      // El invariante es "el stock se descuenta EXACTAMENTE UNA VEZ por
      // pedido", y hay DOS productores del descuento:
      //   - `SalesService.updateOrderStatus` al pasar a CONFIRMED
      //     (`productsService.deductStock`), que no deja rastro en
      //     `stock_movements`;
      //   - esta misma función al cerrar la venta.
      // Por eso la guarda mira el estado de la fila BLOQUEADA: `confirmed` y
      // `completed` son los dos estados que sólo se alcanzan tras un descuento.
      // Colgarla de `!wasCompleted` (o de un rastro en `stock_movements`) dejaba
      // pasar el doble descuento vía `confirmed`.
      const alreadyDeducted =
        locked.status === OrderStatus.CONFIRMED ||
        locked.status === OrderStatus.COMPLETED;
      const becomesCompleted =
        locked.payment_status === OrderPaymentStatus.PAID;

      if (becomesCompleted && !alreadyDeducted) {
        const locationId = await this.locations.ensureDefaultLocation(
          locked.company_id,
          manager,
        );

        // `policy` ya se resolvió ANTES de abrir esta transacción (ver arriba):
        // es una lectura de configuración que no cambia por ítem y que no debe
        // competir por una segunda conexión mientras esta transacción sostiene
        // la suya y sus bloqueos.
        for (const item of items) {
          // Bloqueo pesimista: entre crear el pedido y cobrarlo, otra caja pudo
          // llevarse la última unidad. Revalidamos dentro de la transacción.
          const product = await manager.findOne(Product, {
            where: { id: item.product_id, company_id: locked.company_id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!product) {
            throw new BadRequestException(
              `Product ${item.product_id} not found`,
            );
          }
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
        }
      }

      if (becomesCompleted) {
        // Se marca completado sólo cuando todo el inventario se descontó sin
        // incidencias: si el stock falla, el pedido no queda como vendido.
        locked.status = OrderStatus.COMPLETED;
      }

      // Se guarda la entidad bloqueada, que se leyó SIN `relations`: así el
      // `save` no arrastra en cascada `order_items` ni `payments`.
      await manager.save(Order, locked);
      return saved;
    });

    this.logger.log(
      `Recorded payment of ${dto.amount} for order ${order.order_number} via ${dto.payment_method}`,
    );

    return savedPayment;
  }

  async getPaymentsByOrderId(orderId: string, user: User): Promise<Payment[]> {
    // Verify order ownership
    const order = await this.orderRepository.findOne({
      where: { id: orderId, company_id: user.company_id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const payments = await this.paymentRepository.find({
      where: { order_id: orderId },
      order: { created_at: 'DESC' },
    });

    return payments;
  }

  async refundPayment(paymentId: string, user: User): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    // Verify order ownership
    if (payment.order.company_id !== user.company_id) {
      throw new BadRequestException('Unauthorized to refund this payment');
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Payment is already refunded');
    }

    const order = payment.order;

    const updatedPayment = await this.dataSource.transaction(async (manager) => {
      payment.status = PaymentStatus.REFUNDED;
      const refunded = await manager.save(Payment, payment);

      // Update order payment status
      const remainingPayments =
        (await manager.find(Payment, { where: { order_id: order.id } })) ?? [];

      const totalPaid = remainingPayments
        .filter((p) => p.status !== PaymentStatus.REFUNDED)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      if (totalPaid <= 0) {
        order.payment_status = OrderPaymentStatus.UNPAID;
      } else if (totalPaid < Number(order.total_amount)) {
        order.payment_status = OrderPaymentStatus.PARTIALLY_PAID;
      } else {
        order.payment_status = OrderPaymentStatus.PAID;
      }

      // Un reembolso que deja de cubrir el total tiene que deshacer el cierre:
      // si no, el pedido se queda clavado en `completed` y el stock, corto.
      if (
        order.status === OrderStatus.COMPLETED &&
        order.payment_status !== OrderPaymentStatus.PAID
      ) {
        // Los movimientos SON el registro de lo que nos llevamos. Se devuelve el
        // NETO (OUT − RETURN) por producto, no la suma de los OUT: un pedido
        // puede haber pasado ya por un ciclo cobro → reembolso → nuevo cobro, y
        // sumar los OUT a pelo devolvería el doble. Que no haya ningún
        // movimiento significa que el descuento no lo hizo esta vía sino la de
        // `confirmed`, que no deja rastro y que no nos toca revertir.
        // `reference_id` es un varchar suelto, sin FK ni unicidad: se acota por
        // `company_id` como todas las demás lecturas de este servicio.
        const movements =
          (await manager.find(StockMovement, {
            where: { reference_id: order.id, company_id: order.company_id },
          })) ?? [];

        const netByProduct = new Map<
          string,
          { quantity: number; location_id: string }
        >();
        for (const movement of movements) {
          const entry = netByProduct.get(movement.product_id) ?? {
            quantity: 0,
            location_id: movement.location_id,
          };
          if (movement.movement_type === MovementType.OUT) {
            entry.quantity += movement.quantity;
          } else if (movement.movement_type === MovementType.RETURN) {
            entry.quantity -= movement.quantity;
          }
          netByProduct.set(movement.product_id, entry);
        }

        for (const [productId, entry] of netByProduct) {
          if (entry.quantity <= 0) {
            continue;
          }

          const product = await manager.findOne(Product, {
            where: { id: productId, company_id: order.company_id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!product) {
            continue;
          }

          product.stock_quantity += entry.quantity;
          await manager.save(Product, product);

          await manager.insert(
            StockMovement,
            manager.create(StockMovement, {
              company_id: order.company_id,
              product_id: productId,
              location_id: entry.location_id,
              movement_type: MovementType.RETURN,
              quantity: entry.quantity,
              reference_id: order.id,
              notes: `Reembolso ${order.order_number}`,
              created_by: user.id,
            }),
          );
        }

        // Con rastro devolvimos el stock, así que el pedido vuelve a estar
        // pendiente de cobro y SIN descontar. Sin rastro el stock sigue
        // descontado por la vía `confirmed`, y `confirmed` es justo eso.
        order.status =
          movements.length > 0 ? OrderStatus.PENDING : OrderStatus.CONFIRMED;
      }

      await manager.save(Order, order);
      return refunded;
    });

    this.logger.log(`Refunded payment ${paymentId} for order ${order.order_number}`);

    return updatedPayment;
  }

  async getPaymentSummary(orderId: string, user: User) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, company_id: user.company_id },
      relations: ['payments'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const payments = order.payments || [];
    const totalPaid = payments
      .filter((p) => p.status !== PaymentStatus.REFUNDED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      order_id: orderId,
      order_total: order.total_amount,
      total_paid: totalPaid,
      remaining_balance: Number(order.total_amount) - totalPaid,
      payment_status: order.payment_status,
      payments_count: payments.length,
    };
  }
}
