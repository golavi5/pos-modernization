"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SalesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("../entities/order.entity");
const order_item_entity_1 = require("../entities/order-item.entity");
const order_calculation_service_1 = require("./order-calculation.service");
const products_service_1 = require("../../products/products.service");
let SalesService = SalesService_1 = class SalesService {
    constructor(orderRepository, orderItemRepository, calculationService, productsService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.calculationService = calculationService;
        this.productsService = productsService;
        this.logger = new common_1.Logger(SalesService_1.name);
        this.VALID_STATUS_TRANSITIONS = {
            [order_entity_1.OrderStatus.DRAFT]: [order_entity_1.OrderStatus.PENDING, order_entity_1.OrderStatus.CANCELLED],
            [order_entity_1.OrderStatus.PENDING]: [order_entity_1.OrderStatus.CONFIRMED, order_entity_1.OrderStatus.CANCELLED],
            [order_entity_1.OrderStatus.CONFIRMED]: [order_entity_1.OrderStatus.COMPLETED, order_entity_1.OrderStatus.VOIDED],
            [order_entity_1.OrderStatus.COMPLETED]: [],
            [order_entity_1.OrderStatus.CANCELLED]: [],
            [order_entity_1.OrderStatus.VOIDED]: [],
        };
    }
    async listOrders(query, user) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;
        const where = {
            company_id: user.company_id,
        };
        if (query.status) {
            where.status = query.status;
        }
        if (query.customer_id) {
            where.customer_id = query.customer_id;
        }
        if (query.startDate || query.endDate) {
            where.order_date = (0, typeorm_2.Between)(query.startDate || new Date(0), query.endDate || new Date());
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
    async getOrderById(id, user) {
        const order = await this.orderRepository.findOne({
            where: { id, company_id: user.company_id },
            relations: ['order_items', 'payments', 'order_items.product'],
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID ${id} not found`);
        }
        return order;
    }
    async createOrder(dto, user) {
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('Order must have at least 1 item');
        }
        for (const item of dto.items) {
            const product = await this.productsService.findOne(item.product_id, user);
            if (!product) {
                throw new common_1.BadRequestException(`Product with ID ${item.product_id} not found`);
            }
            if (product.stock_quantity < item.quantity) {
                throw new common_1.BadRequestException(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`);
            }
        }
        const calculatedItems = this.calculationService.calculateOrderItemTotals(dto.items);
        const { subtotal, tax_amount, total_amount } = this.calculationService.calculateOrderTotals(calculatedItems, dto.discount_amount || 0);
        const orderNumber = await this.generateOrderNumber(user.company_id);
        const order = new order_entity_1.Order();
        order.company_id = user.company_id;
        order.customer_id = dto.customer_id;
        order.order_number = orderNumber;
        order.status = order_entity_1.OrderStatus.DRAFT;
        order.subtotal = subtotal;
        order.tax_amount = tax_amount;
        order.discount_amount = dto.discount_amount || 0;
        order.total_amount = total_amount;
        order.payment_status = order_entity_1.PaymentStatus.UNPAID;
        order.notes = dto.notes;
        order.created_by = user.id;
        order.order_date = new Date();
        const savedOrder = await this.orderRepository.save(order);
        const orderItems = calculatedItems.map((item) => {
            const orderItem = new order_item_entity_1.OrderItem();
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
        const completeOrder = await this.getOrderById(savedOrder.id, user);
        this.logger.log(`Created order ${orderNumber} for company ${user.company_id}`);
        return completeOrder;
    }
    async updateOrder(id, dto, user) {
        const order = await this.getOrderById(id, user);
        if ([order_entity_1.OrderStatus.COMPLETED, order_entity_1.OrderStatus.CANCELLED, order_entity_1.OrderStatus.VOIDED].includes(order.status)) {
            throw new common_1.ConflictException(`Cannot modify order with status ${order.status}`);
        }
        order.customer_id = dto.customer_id ?? order.customer_id;
        order.notes = dto.notes ?? order.notes;
        const updatedOrder = await this.orderRepository.save(order);
        this.logger.log(`Updated order ${order.order_number}`);
        return this.getOrderById(updatedOrder.id, user);
    }
    async updateOrderStatus(id, dto, user) {
        const order = await this.getOrderById(id, user);
        const validTransitions = this.VALID_STATUS_TRANSITIONS[order.status];
        if (!validTransitions.includes(dto.status)) {
            throw new common_1.BadRequestException(`Cannot transition from ${order.status} to ${dto.status}. Valid transitions: ${validTransitions.join(', ')}`);
        }
        if (dto.status === order_entity_1.OrderStatus.CONFIRMED) {
            for (const item of order.order_items) {
                await this.productsService.deductStock(item.product_id, item.quantity, user);
            }
        }
        order.status = dto.status;
        const updatedOrder = await this.orderRepository.save(order);
        this.logger.log(`Updated order ${order.order_number} status to ${dto.status}`);
        return this.getOrderById(updatedOrder.id, user);
    }
    async deleteOrder(id, user) {
        const order = await this.getOrderById(id, user);
        if (order.status !== order_entity_1.OrderStatus.DRAFT) {
            throw new common_1.BadRequestException('Only draft orders can be deleted. Use void/cancel instead.');
        }
        await this.orderItemRepository.delete({ order_id: id });
        await this.orderRepository.delete({ id });
        this.logger.log(`Deleted order ${order.order_number}`);
        return { message: `Order ${order.order_number} has been deleted` };
    }
    async getOrderPayments(id, user) {
        const order = await this.getOrderById(id, user);
        return order.payments || [];
    }
    async generateOrderNumber(companyId) {
        const today = new Date();
        const datePrefix = today.toISOString().split('T')[0].replace(/-/g, '');
        const lastOrder = await this.orderRepository.findOne({
            where: {
                company_id: companyId,
            },
            order: { created_at: 'DESC' },
        });
        let sequenceNumber = 1;
        if (lastOrder && lastOrder.order_number.startsWith(`ORD${datePrefix}`)) {
            sequenceNumber = parseInt(lastOrder.order_number.substring(11)) + 1;
        }
        return `ORD${datePrefix}${String(sequenceNumber).padStart(5, '0')}`;
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = SalesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        order_calculation_service_1.OrderCalculationService,
        products_service_1.ProductsService])
], SalesService);
//# sourceMappingURL=sales.service.js.map