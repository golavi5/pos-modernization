"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderCalculationService = void 0;
const common_1 = require("@nestjs/common");
let OrderCalculationService = class OrderCalculationService {
    calculateOrderItemTotals(items) {
        return items.map((item) => {
            const subtotal = item.quantity * item.unit_price;
            const taxAmount = subtotal * 0.19;
            const total = subtotal + taxAmount;
            return {
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal,
                tax_amount: taxAmount,
                total,
            };
        });
    }
    calculateOrderTotals(orderItems, discountAmount = 0) {
        const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        const tax_amount = orderItems.reduce((sum, item) => sum + item.tax_amount, 0);
        const total_amount = subtotal + tax_amount - discountAmount;
        return {
            subtotal,
            tax_amount,
            total_amount: Math.max(0, total_amount),
        };
    }
    calculatePaymentStatus(totalAmount, paidAmount) {
        if (paidAmount <= 0) {
            return 'unpaid';
        }
        else if (paidAmount < totalAmount) {
            return 'partially_paid';
        }
        else {
            return 'paid';
        }
    }
};
exports.OrderCalculationService = OrderCalculationService;
exports.OrderCalculationService = OrderCalculationService = __decorate([
    (0, common_1.Injectable)()
], OrderCalculationService);
//# sourceMappingURL=order-calculation.service.js.map