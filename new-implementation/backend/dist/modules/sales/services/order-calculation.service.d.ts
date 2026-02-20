import { CreateOrderItemDto } from '../dto/create-order.dto';
interface CalculatedOrderItem {
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    tax_amount: number;
    total: number;
}
export declare class OrderCalculationService {
    calculateOrderItemTotals(items: CreateOrderItemDto[]): CalculatedOrderItem[];
    calculateOrderTotals(orderItems: CalculatedOrderItem[], discountAmount?: number): {
        subtotal: number;
        tax_amount: number;
        total_amount: number;
    };
    calculatePaymentStatus(totalAmount: number, paidAmount: number): "unpaid" | "partially_paid" | "paid";
}
export {};
