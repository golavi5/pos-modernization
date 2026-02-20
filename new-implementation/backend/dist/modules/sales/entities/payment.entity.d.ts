import { Order } from './order.entity';
export declare enum PaymentMethod {
    CASH = "cash",
    CARD = "card",
    TRANSFER = "transfer",
    OTHER = "other"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare class Payment {
    id: string;
    order_id: string;
    payment_method: PaymentMethod;
    amount: number;
    payment_date: Date;
    transaction_id?: string;
    status: PaymentStatus;
    created_at: Date;
    order: Order;
}
