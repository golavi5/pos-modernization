import { OrderStatus } from '../entities/order.entity';
export declare class UpdateOrderDto {
    customer_id?: string;
    notes?: string;
    status?: OrderStatus;
}
