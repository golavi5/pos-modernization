"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const sales_controller_1 = require("./sales.controller");
const payments_controller_1 = require("./payments.controller");
const sales_service_1 = require("./services/sales.service");
const payments_service_1 = require("./services/payments.service");
const order_calculation_service_1 = require("./services/order-calculation.service");
const order_entity_1 = require("./entities/order.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const payment_entity_1 = require("./entities/payment.entity");
const auth_module_1 = require("../auth/auth.module");
const products_module_1 = require("../products/products.module");
let SalesModule = class SalesModule {
};
exports.SalesModule = SalesModule;
exports.SalesModule = SalesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([order_entity_1.Order, order_item_entity_1.OrderItem, payment_entity_1.Payment]),
            auth_module_1.AuthModule,
            products_module_1.ProductsModule,
        ],
        controllers: [sales_controller_1.SalesController, payments_controller_1.PaymentsController],
        providers: [sales_service_1.SalesService, payments_service_1.PaymentsService, order_calculation_service_1.OrderCalculationService],
        exports: [sales_service_1.SalesService, payments_service_1.PaymentsService, order_calculation_service_1.OrderCalculationService],
    })
], SalesModule);
//# sourceMappingURL=sales.module.js.map