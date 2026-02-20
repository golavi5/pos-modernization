import { User } from '../../auth/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';
export declare enum OrderStatus {
    DRAFT = "draft",
    PENDING = "pending",
    CONFIRMED = "confirmed",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    VOIDED = "voided"
}
export declare enum PaymentStatus {
    UNPAID = "unpaid",
    PARTIALLY_PAID = "partially_paid",
    PAID = "paid",
    REFUNDED = "refunded"
}
export declare class Order {
    id: string;
    company_id: string;
    customer_id?: string;
    order_number: string;
    order_date: Date;
    status: OrderStatus;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    payment_status: PaymentStatus;
    notes?: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    company: Company;
    creator: User;
    order_items: OrderItem[];
    payments: Payment[];
}
