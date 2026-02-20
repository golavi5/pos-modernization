import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { Order, PaymentStatus as OrderPaymentStatus } from '../entities/order.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { User } from '../../auth/entities/user.entity';
export declare class PaymentsService {
    private readonly paymentRepository;
    private readonly orderRepository;
    private readonly logger;
    constructor(paymentRepository: Repository<Payment>, orderRepository: Repository<Order>);
    recordPayment(orderId: string, dto: CreatePaymentDto, user: User): Promise<Payment>;
    getPaymentsByOrderId(orderId: string, user: User): Promise<Payment[]>;
    refundPayment(paymentId: string, user: User): Promise<Payment>;
    getPaymentSummary(orderId: string, user: User): Promise<{
        order_id: string;
        order_total: number;
        total_paid: number;
        remaining_balance: number;
        payment_status: OrderPaymentStatus;
        payments_count: number;
    }>;
}
