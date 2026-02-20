import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrderQueryDto } from '../dto/order-query.dto';
import { OrderCalculationService } from './order-calculation.service';
import { ProductsService } from '../../products/products.service';
import { User } from '../../auth/entities/user.entity';
export declare class SalesService {
    private readonly orderRepository;
    private readonly orderItemRepository;
    private readonly calculationService;
    private readonly productsService;
    private readonly logger;
    private readonly VALID_STATUS_TRANSITIONS;
    constructor(orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>, calculationService: OrderCalculationService, productsService: ProductsService);
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
    getOrderPayments(id: string, user: User): Promise<import("../entities/payment.entity").Payment[]>;
    private generateOrderNumber;
}
