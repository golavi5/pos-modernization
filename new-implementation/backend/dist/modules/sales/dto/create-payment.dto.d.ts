import { PaymentMethod } from '../entities/payment.entity';
export declare class CreatePaymentDto {
    payment_method: PaymentMethod;
    amount: number;
    transaction_id?: string;
}
