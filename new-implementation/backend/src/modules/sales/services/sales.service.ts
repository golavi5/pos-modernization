import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrderQueryDto } from '../dto/order-query.dto';
import { OrderCalculationService } from './order-calculation.service';
import { ProductsService } from '../../products/products.service';
import { User } from '../../auth/entities/user.entity';

interface CurrentUser extends User {
  company_id: number;
}

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  private readonly VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.DRAFT]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.COMPLETED, OrderStatus.VOIDED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.VOIDED]: [],
  };

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly calculationService: OrderCalculationService,
    private readonly productsService: ProductsService,
  ) {}

  async listOrders(query: OrderQueryDto, user: CurrentUser): Promise<{ orders: Order[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Order> = {
      company_id: user.company_id,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.customer_id) {
      where.customer_id = query.customer_id;
    }

    if (query.startDate || query.endDate) {
      where.order_date = Between(
        query.startDate || new Date(0),
        query.endDate || new Date(),
      );
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      relations: ['order_items', 'payments'],
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    this.logger.log(`Retrieved ${orders.length} orders for company ${user.company_id}`);
    return { orders, total };
  }

  async getOrderById(id: number, user: CurrentUser): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, company_id: user.company_id },
      relations: ['order_items', 'payments', 'order_items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async createOrder(dto: CreateOrderDto, user: CurrentUser): Promise<Order> {
    // Validate items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have at least 1 item');
    }

    // Check stock availability
    for (const item of dto.items) {
      const product = await this.productsService.findOne(item.product_id, user);
      if (!product) {
        throw new BadRequestException(`Product with ID ${item.product_id} not found`);
      }
      if (product.stock_quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`,
        );
      }
    }

    // Calculate order items and totals
    const calculatedItems = this.calculationService.calculateOrderItemTotals(dto.items);
    const { subtotal, tax_amount, total_amount } = this.calculationService.calculateOrderTotals(
      calculatedItems,
      dto.discount_amount || 0,
    );

    // Generate unique order number
    const orderNumber = await this.generateOrderNumber(user.company_id);

    // Create order
    const order = new Order();
    order.company_id = user.company_id;
    order.customer_id = dto.customer_id;
    order.order_number = orderNumber;
    order.status = OrderStatus.DRAFT;
    order.subtotal = subtotal;
    order.tax_amount = tax_amount;
    order.discount_amount = dto.discount_amount || 0;
    order.total_amount = total_amount;
    order.payment_status = PaymentStatus.UNPAID;
    order.notes = dto.notes;
    order.created_by = user.id;
    order.order_date = new Date();

    const savedOrder = await this.orderRepository.save(order);

    // Create order items
    const orderItems = calculatedItems.map(item => {
      const orderItem = new OrderItem();
      orderItem.order_id = savedOrder.id;
      orderItem.product_id = item.product_id;
      orderItem.quantity = item.quantity;
      orderItem.unit_price = item.unit_price;
      orderItem.subtotal = item.subtotal;
      orderItem.tax_amount = item.tax_amount;
      orderItem.total = item.total;
      return orderItem;
    });

    await this.orderItemRepository.save(orderItems);

    // Load complete order with items
    const completeOrder = await this.getOrderById(savedOrder.id, user);
    this.logger.log(`Created order ${orderNumber} for company ${user.company_id}`);

    return completeOrder;
  }

  async updateOrder(id: number, dto: UpdateOrderDto, user: CurrentUser): Promise<Order> {
    const order = await this.getOrderById(id, user);

    // Check if order can be modified
    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.VOIDED].includes(order.status)) {
      throw new ConflictException(`Cannot modify order with status ${order.status}`);
    }

    order.customer_id = dto.customer_id ?? order.customer_id;
    order.notes = dto.notes ?? order.notes;

    const updatedOrder = await this.orderRepository.save(order);
    this.logger.log(`Updated order ${order.order_number}`);

    return this.getOrderById(updatedOrder.id, user);
  }

  async updateOrderStatus(id: number, dto: UpdateOrderStatusDto, user: CurrentUser): Promise<Order> {
    const order = await this.getOrderById(id, user);

    // Validate status transition
    const validTransitions = this.VALID_STATUS_TRANSITIONS[order.status];
    if (!validTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}. Valid transitions: ${validTransitions.join(', ')}`,
      );
    }

    // Special handling for confirmation
    if (dto.status === OrderStatus.CONFIRMED) {
      // Deduct stock from products
      for (const item of order.order_items) {
        await this.productsService.deductStock(item.product_id, item.quantity, user);
      }
    }

    order.status = dto.status;
    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(`Updated order ${order.order_number} status to ${dto.status}`);
    return this.getOrderById(updatedOrder.id, user);
  }

  async deleteOrder(id: number, user: CurrentUser): Promise<{ message: string }> {
    const order = await this.getOrderById(id, user);

    // Only allow deletion of draft orders
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Only draft orders can be deleted. Use void/cancel instead.');
    }

    await this.orderItemRepository.delete({ order_id: id });
    await this.orderRepository.delete({ id });

    this.logger.log(`Deleted order ${order.order_number}`);
    return { message: `Order ${order.order_number} has been deleted` };
  }

  async getOrderPayments(id: number, user: CurrentUser) {
    const order = await this.getOrderById(id, user);
    return order.payments || [];
  }

  private async generateOrderNumber(companyId: number): Promise<string> {
    const today = new Date();
    const datePrefix = today.toISOString().split('T')[0].replace(/-/g, '');

    // Get the latest order number for this company on this date
    const lastOrder = await this.orderRepository.findOne({
      where: {
        company_id: companyId,
      },
      order: { id: 'DESC' },
    });

    const sequenceNumber = lastOrder ? parseInt(lastOrder.order_number.substring(8)) + 1 : 1;
    return `ORD${datePrefix}${String(sequenceNumber).padStart(5, '0')}`;
  }
}
