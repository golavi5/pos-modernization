import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Order, PaymentStatus as OrderPaymentStatus } from '../entities/order.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { User } from '../../auth/entities/user.entity';

interface CurrentUser extends User {
  company_id: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async recordPayment(orderId: number, dto: CreatePaymentDto, user: CurrentUser): Promise<Payment> {
    // Get order and verify ownership
    const order = await this.orderRepository.findOne({
      where: { id: orderId, company_id: user.company_id },
      relations: ['payments'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Validate payment amount
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Calculate total paid
    const totalPaid = (order.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = order.total_amount - totalPaid;

    if (dto.amount > remainingBalance) {
      throw new BadRequestException(
        `Payment amount ${dto.amount} exceeds remaining balance ${remainingBalance}`,
      );
    }

    // Create payment record
    const payment = new Payment();
    payment.order_id = orderId;
    payment.payment_method = dto.payment_method;
    payment.amount = dto.amount;
    payment.transaction_id = dto.transaction_id;
    payment.status = PaymentStatus.COMPLETED;
    payment.payment_date = new Date();

    const savedPayment = await this.paymentRepository.save(payment);

    // Update order payment status
    const newTotalPaid = totalPaid + dto.amount;
    if (newTotalPaid >= order.total_amount) {
      order.payment_status = OrderPaymentStatus.PAID;
    } else if (newTotalPaid > 0) {
      order.payment_status = OrderPaymentStatus.PARTIALLY_PAID;
    }

    await this.orderRepository.save(order);

    this.logger.log(
      `Recorded payment of ${dto.amount} for order ${order.order_number} via ${dto.payment_method}`,
    );

    return savedPayment;
  }

  async getPaymentsByOrderId(orderId: number, user: CurrentUser): Promise<Payment[]> {
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

  async refundPayment(paymentId: number, user: CurrentUser): Promise<Payment> {
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
      .filter(p => p.status !== PaymentStatus.REFUNDED)
      .reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid <= 0) {
      order.payment_status = OrderPaymentStatus.UNPAID;
    } else if (totalPaid < order.total_amount) {
      order.payment_status = OrderPaymentStatus.PARTIALLY_PAID;
    } else {
      order.payment_status = OrderPaymentStatus.PAID;
    }

    await this.orderRepository.save(order);

    this.logger.log(`Refunded payment ${paymentId} for order ${order.order_number}`);

    return updatedPayment;
  }

  async getPaymentSummary(orderId: number, user: CurrentUser) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, company_id: user.company_id },
      relations: ['payments'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const payments = order.payments || [];
    const totalPaid = payments
      .filter(p => p.status !== PaymentStatus.REFUNDED)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      order_id: orderId,
      order_total: order.total_amount,
      total_paid: totalPaid,
      remaining_balance: order.total_amount - totalPaid,
      payment_status: order.payment_status,
      payments_count: payments.length,
    };
  }
}
