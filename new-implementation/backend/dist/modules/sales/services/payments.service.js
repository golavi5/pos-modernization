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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_entity_1 = require("../entities/payment.entity");
const order_entity_1 = require("../entities/order.entity");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(paymentRepository, orderRepository) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.logger = new common_1.Logger(PaymentsService_1.name);
    }
    async recordPayment(orderId, dto, user) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, company_id: user.company_id },
            relations: ['payments'],
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID ${orderId} not found`);
        }
        if (dto.amount <= 0) {
            throw new common_1.BadRequestException('Payment amount must be greater than 0');
        }
        const totalPaid = (order.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const remainingBalance = Number(order.total_amount) - totalPaid;
        if (dto.amount > remainingBalance) {
            throw new common_1.BadRequestException(`Payment amount ${dto.amount} exceeds remaining balance ${remainingBalance}`);
        }
        const payment = new payment_entity_1.Payment();
        payment.order_id = orderId;
        payment.payment_method = dto.payment_method;
        payment.amount = dto.amount;
        payment.transaction_id = dto.transaction_id;
        payment.status = payment_entity_1.PaymentStatus.COMPLETED;
        payment.payment_date = new Date();
        const savedPayment = await this.paymentRepository.save(payment);
        const newTotalPaid = totalPaid + dto.amount;
        if (newTotalPaid >= Number(order.total_amount)) {
            order.payment_status = order_entity_1.PaymentStatus.PAID;
        }
        else if (newTotalPaid > 0) {
            order.payment_status = order_entity_1.PaymentStatus.PARTIALLY_PAID;
        }
        await this.orderRepository.save(order);
        this.logger.log(`Recorded payment of ${dto.amount} for order ${order.order_number} via ${dto.payment_method}`);
        return savedPayment;
    }
    async getPaymentsByOrderId(orderId, user) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, company_id: user.company_id },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID ${orderId} not found`);
        }
        const payments = await this.paymentRepository.find({
            where: { order_id: orderId },
            order: { created_at: 'DESC' },
        });
        return payments;
    }
    async refundPayment(paymentId, user) {
        const payment = await this.paymentRepository.findOne({
            where: { id: paymentId },
            relations: ['order'],
        });
        if (!payment) {
            throw new common_1.NotFoundException(`Payment with ID ${paymentId} not found`);
        }
        if (payment.order.company_id !== user.company_id) {
            throw new common_1.BadRequestException('Unauthorized to refund this payment');
        }
        if (payment.status === payment_entity_1.PaymentStatus.REFUNDED) {
            throw new common_1.BadRequestException('Payment is already refunded');
        }
        payment.status = payment_entity_1.PaymentStatus.REFUNDED;
        const updatedPayment = await this.paymentRepository.save(payment);
        const order = payment.order;
        const remainingPayments = await this.paymentRepository.find({
            where: { order_id: order.id },
        });
        const totalPaid = remainingPayments
            .filter((p) => p.status !== payment_entity_1.PaymentStatus.REFUNDED)
            .reduce((sum, p) => sum + Number(p.amount), 0);
        if (totalPaid <= 0) {
            order.payment_status = order_entity_1.PaymentStatus.UNPAID;
        }
        else if (totalPaid < Number(order.total_amount)) {
            order.payment_status = order_entity_1.PaymentStatus.PARTIALLY_PAID;
        }
        else {
            order.payment_status = order_entity_1.PaymentStatus.PAID;
        }
        await this.orderRepository.save(order);
        this.logger.log(`Refunded payment ${paymentId} for order ${order.order_number}`);
        return updatedPayment;
    }
    async getPaymentSummary(orderId, user) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, company_id: user.company_id },
            relations: ['payments'],
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID ${orderId} not found`);
        }
        const payments = order.payments || [];
        const totalPaid = payments
            .filter((p) => p.status !== payment_entity_1.PaymentStatus.REFUNDED)
            .reduce((sum, p) => sum + Number(p.amount), 0);
        return {
            order_id: orderId,
            order_total: order.total_amount,
            total_paid: totalPaid,
            remaining_balance: Number(order.total_amount) - totalPaid,
            payment_status: order.payment_status,
            payments_count: payments.length,
        };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map