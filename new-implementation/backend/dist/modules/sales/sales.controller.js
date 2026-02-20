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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const sales_service_1 = require("./services/sales.service");
const order_calculation_service_1 = require("./services/order-calculation.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const create_order_dto_1 = require("./dto/create-order.dto");
const update_order_dto_1 = require("./dto/update-order.dto");
const update_order_status_dto_1 = require("./dto/update-order-status.dto");
const order_query_dto_1 = require("./dto/order-query.dto");
const user_entity_1 = require("../auth/entities/user.entity");
let SalesController = class SalesController {
    constructor(salesService, calculationService) {
        this.salesService = salesService;
        this.calculationService = calculationService;
    }
    async listOrders(query, user) {
        return this.salesService.listOrders(query, user);
    }
    async getOrderById(id, user) {
        return this.salesService.getOrderById(id, user);
    }
    async createOrder(dto, user) {
        return this.salesService.createOrder(dto, user);
    }
    async updateOrder(id, dto, user) {
        return this.salesService.updateOrder(id, dto, user);
    }
    async updateOrderStatus(id, dto, user) {
        return this.salesService.updateOrderStatus(id, dto, user);
    }
    async deleteOrder(id, user) {
        return this.salesService.deleteOrder(id, user);
    }
    async getOrderPayments(id, user) {
        return this.salesService.getOrderPayments(id, user);
    }
    async getDailySalesReport(user, date) {
        const reportDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(reportDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(reportDate);
        endOfDay.setHours(23, 59, 59, 999);
        const { orders } = await this.salesService.listOrders({
            page: 1,
            limit: 1000,
            startDate: startOfDay,
            endDate: endOfDay,
        }, user);
        return this.generateSalesSummary(orders, startOfDay, endOfDay);
    }
    async getSalesSummary(user, startDate, endDate) {
        const start = startDate
            ? new Date(startDate)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const { orders } = await this.salesService.listOrders({
            page: 1,
            limit: 1000,
            startDate: start,
            endDate: end,
        }, user);
        return this.generateSalesSummary(orders, start, end);
    }
    generateSalesSummary(orders, startDate, endDate) {
        const completedOrders = orders.filter((o) => o.status === 'completed');
        const totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        const totalDiscount = completedOrders.reduce((sum, order) => sum + Number(order.discount_amount), 0);
        const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
        return {
            total_orders: completedOrders.length,
            total_revenue: Math.round(totalRevenue * 100) / 100,
            total_discount: Math.round(totalDiscount * 100) / 100,
            average_order_value: Math.round(averageOrderValue * 100) / 100,
            date_range: {
                start_date: startDate,
                end_date: endDate,
            },
        };
    }
};
exports.SalesController = SalesController;
__decorate([
    (0, common_1.Get)('orders'),
    (0, roles_decorator_1.Roles)('cashier', 'manager', 'admin'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [order_query_dto_1.OrderQueryDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "listOrders", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, roles_decorator_1.Roles)('cashier', 'manager', 'admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getOrderById", null);
__decorate([
    (0, common_1.Post)('orders'),
    (0, roles_decorator_1.Roles)('cashier', 'manager'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_order_dto_1.CreateOrderDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Put)('orders/:id'),
    (0, roles_decorator_1.Roles)('manager'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_dto_1.UpdateOrderDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "updateOrder", null);
__decorate([
    (0, common_1.Patch)('orders/:id/status'),
    (0, roles_decorator_1.Roles)('cashier', 'manager'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_order_status_dto_1.UpdateOrderStatusDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "updateOrderStatus", null);
__decorate([
    (0, common_1.Delete)('orders/:id'),
    (0, roles_decorator_1.Roles)('manager'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "deleteOrder", null);
__decorate([
    (0, common_1.Get)('orders/:id/payments'),
    (0, roles_decorator_1.Roles)('cashier', 'manager', 'admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getOrderPayments", null);
__decorate([
    (0, common_1.Get)('reports/daily'),
    (0, roles_decorator_1.Roles)('manager', 'admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getDailySalesReport", null);
__decorate([
    (0, common_1.Get)('reports/summary'),
    (0, roles_decorator_1.Roles)('manager', 'admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, String, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getSalesSummary", null);
exports.SalesController = SalesController = __decorate([
    (0, common_1.Controller)('sales'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [sales_service_1.SalesService,
        order_calculation_service_1.OrderCalculationService])
], SalesController);
//# sourceMappingURL=sales.controller.js.map