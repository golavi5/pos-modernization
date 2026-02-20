import { OrderStatus } from '../entities/order.entity';
export declare class OrderQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: OrderStatus;
    customer_id?: string;
    company_id?: string;
    startDate?: Date;
    endDate?: Date;
}
