import { OrderItem } from '../entities/order-item.entity';
import { Payment } from '../entities/payment.entity';
import { OrderStatus, PaymentStatus } from '../entities/order.entity';
export declare class OrderResponseDto {
    id: number;
    order_number: string;
    company_id: number;
    customer_id?: number;
    order_date: Date;
    status: OrderStatus;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    payment_status: PaymentStatus;
    notes?: string;
    created_by: number;
    created_at: Date;
    updated_at: Date;
    order_items: OrderItem[];
    payments: Payment[];
}
