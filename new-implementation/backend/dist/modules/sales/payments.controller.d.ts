import { PaymentsService } from './services/payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { User } from '../auth/entities/user.entity';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    recordPayment(orderId: string, dto: CreatePaymentDto, user: User): Promise<Payment>;
    getPayments(orderId: string, user: User): Promise<Payment[]>;
    getPaymentSummary(orderId: string, user: User): Promise<{
        order_id: string;
        order_total: number;
        total_paid: number;
        remaining_balance: number;
        payment_status: import("./entities/order.entity").PaymentStatus;
        payments_count: number;
    }>;
}
