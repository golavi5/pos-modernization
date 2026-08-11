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

    // Calculate total paid
    const totalPaid = (order.payments || []).reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const remainingBalance = Number(order.total_amount) - totalPaid;

    if (dto.amount > remainingBalance) {
      throw new BadRequestException(
        `Payment amount ${dto.amount} exceeds remaining balance ${remainingBalance}`,
      );
    }

    // Se calcula ANTES de tocar el pedido: la guarda del descuento cuelga de la
    // TRANSICIÓN a completed, no del estado final.
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

        // Se marca completado sólo cuando todo el inventario se descontó sin
        // incidencias: si el stock falla, el pedido no queda como vendido.
        order.status = OrderStatus.COMPLETED;
      }

      await manager.save(Order, order);
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

    payment.status = PaymentStatus.REFUNDED;
    const updatedPayment = await this.paymentRepository.save(payment);

    // Update order payment status
    const order = payment.order;
    const remainingPayments = await this.paymentRepository.find({
      where: { order_id: order.id },
    });

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

    await this.orderRepository.save(order);

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
