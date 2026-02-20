import { SalesService } from './services/sales.service';
import { OrderCalculationService } from './services/order-calculation.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { Order } from './entities/order.entity';
import { User } from '../auth/entities/user.entity';
import { SalesSummaryDto } from './dto/sales-summary.dto';
export declare class SalesController {
    private readonly salesService;
    private readonly calculationService;
    constructor(salesService: SalesService, calculationService: OrderCalculationService);
    listOrders(query: OrderQueryDto, user: User): Promise<{
        orders: Order[];
        total: number;
    }>;
    getOrderById(id: string, user: User): Promise<Order>;
    createOrder(dto: CreateOrderDto, user: User): Promise<Order>;
    updateOrder(id: string, dto: UpdateOrderDto, user: User): Promise<Order>;
    updateOrderStatus(id: string, dto: UpdateOrderStatusDto, user: User): Promise<Order>;
    deleteOrder(id: string, user: User): Promise<{
        message: string;
    }>;
    getOrderPayments(id: string, user: User): Promise<import("./entities/payment.entity").Payment[]>;
    getDailySalesReport(user: User, date?: string): Promise<SalesSummaryDto>;
    getSalesSummary(user: User, startDate?: string, endDate?: string): Promise<SalesSummaryDto>;
    private generateSalesSummary;
}
