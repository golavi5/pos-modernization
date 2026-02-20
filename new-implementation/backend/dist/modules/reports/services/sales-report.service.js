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
var SalesReportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesReportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("../../sales/entities/order.entity");
const order_item_entity_1 = require("../../sales/entities/order-item.entity");
const report_query_dto_1 = require("../dto/report-query.dto");
let SalesReportService = SalesReportService_1 = class SalesReportService {
    constructor(orderRepository, orderItemRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.logger = new common_1.Logger(SalesReportService_1.name);
    }
    async getSalesSummary(companyId, query) {
        const { startDate, endDate } = this.getDateRange(query);
        const currentPeriod = await this.calculatePeriodMetrics(companyId, startDate, endDate);
        const periodLength = endDate.getTime() - startDate.getTime();
        const prevEndDate = new Date(startDate.getTime() - 1);
        const prevStartDate = new Date(startDate.getTime() - periodLength);
        const previousPeriod = await this.calculatePeriodMetrics(companyId, prevStartDate, prevEndDate);
        const salesChange = this.calculatePercentageChange(previousPeriod.totalSales, currentPeriod.totalSales);
        const revenueChange = this.calculatePercentageChange(previousPeriod.totalRevenue, currentPeriod.totalRevenue);
        const profitChange = this.calculatePercentageChange(previousPeriod.totalProfit, currentPeriod.totalProfit);
        return {
            ...currentPeriod,
            period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
            comparedToLastPeriod: {
                salesChange,
                revenueChange,
                profitChange,
            },
        };
    }
    async getSalesByPeriod(companyId, query) {
        const { startDate, endDate } = this.getDateRange(query);
        const summary = await this.getSalesSummary(companyId, query);
        const periodData = await this.getSalesGroupedByPeriod(companyId, startDate, endDate, query.period);
        return {
            summary,
            periodData,
            generatedAt: new Date(),
        };
    }
    async getRevenueTrends(companyId, query) {
        const { startDate, endDate } = this.getDateRange(query);
        const trends = await this.getSalesGroupedByPeriod(companyId, startDate, endDate, query.period);
        const byPaymentMethod = await this.getRevenueByPaymentMethod(companyId, startDate, endDate);
        const totalRevenue = byPaymentMethod.reduce((sum, method) => sum + method.totalRevenue, 0);
        return {
            trends,
            byPaymentMethod,
            totalRevenue,
            generatedAt: new Date(),
        };
    }
    async calculatePeriodMetrics(companyId, startDate, endDate) {
        const orders = await this.orderRepository.find({
            where: {
                company_id: companyId,
                created_at: (0, typeorm_2.Between)(startDate, endDate),
            },
            relations: ['order_items', 'order_items.product'],
        });
        const totalSales = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        const totalItems = orders.reduce((sum, order) => sum + order.order_items.reduce((s, item) => s + item.quantity, 0), 0);
        const totalProfit = orders.reduce((sum, order) => {
            const saleProfit = order.order_items.reduce((itemSum, item) => {
                const profit = (Number(item.unit_price) - (item.product?.cost || 0)) * item.quantity;
                return itemSum + profit;
            }, 0);
            return sum + saleProfit;
        }, 0);
        const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
        return {
            totalSales,
            totalRevenue,
            totalProfit,
            averageTicket,
            totalItems,
        };
    }
    async getSalesGroupedByPeriod(companyId, startDate, endDate, periodType) {
        let dateFormat;
        let groupBy;
        switch (periodType) {
            case report_query_dto_1.PeriodType.DAILY:
                dateFormat = '%Y-%m-%d';
                groupBy = 'DATE(order.created_at)';
                break;
            case report_query_dto_1.PeriodType.WEEKLY:
                dateFormat = '%Y-W%u';
                groupBy = 'YEARWEEK(order.created_at)';
                break;
            case report_query_dto_1.PeriodType.MONTHLY:
                dateFormat = '%Y-%m';
                groupBy = 'DATE_FORMAT(order.created_at, "%Y-%m")';
                break;
            case report_query_dto_1.PeriodType.YEARLY:
                dateFormat = '%Y';
                groupBy = 'YEAR(order.created_at)';
                break;
            default:
                dateFormat = '%Y-%m-%d';
                groupBy = 'DATE(order.created_at)';
        }
        const results = await this.orderRepository
            .createQueryBuilder('order')
            .select(`DATE_FORMAT(order.created_at, '${dateFormat}')`, 'date')
            .addSelect('COUNT(*)', 'totalSales')
            .addSelect('SUM(order.total_amount)', 'totalRevenue')
            .addSelect('AVG(order.total_amount)', 'averageTicket')
            .where('order.company_id = :companyId', { companyId })
            .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
        })
            .groupBy(groupBy)
            .orderBy('date', 'ASC')
            .getRawMany();
        return results.map((row) => ({
            date: row.date,
            totalSales: parseInt(row.totalSales),
            totalRevenue: parseFloat(row.totalRevenue || '0'),
            totalItems: 0,
            averageTicket: parseFloat(row.averageTicket || '0'),
        }));
    }
    async getRevenueByPaymentMethod(companyId, startDate, endDate) {
        const results = await this.orderRepository
            .createQueryBuilder('order')
            .innerJoin('order.payments', 'payment')
            .select('payment.payment_method', 'paymentMethod')
            .addSelect('SUM(payment.amount)', 'totalRevenue')
            .addSelect('COUNT(DISTINCT order.id)', 'transactionCount')
            .where('order.company_id = :companyId', { companyId })
            .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
        })
            .groupBy('payment.payment_method')
            .getRawMany();
        const totalRevenue = results.reduce((sum, row) => sum + parseFloat(row.totalRevenue || '0'), 0);
        return results.map((row) => ({
            paymentMethod: row.paymentMethod,
            totalRevenue: parseFloat(row.totalRevenue || '0'),
            transactionCount: parseInt(row.transactionCount),
            percentage: totalRevenue > 0
                ? (parseFloat(row.totalRevenue || '0') / totalRevenue) * 100
                : 0,
        }));
    }
    calculatePercentageChange(oldValue, newValue) {
        if (oldValue === 0)
            return newValue > 0 ? 100 : 0;
        return ((newValue - oldValue) / oldValue) * 100;
    }
    getDateRange(query) {
        if (query.startDate && query.endDate) {
            return {
                startDate: new Date(query.startDate),
                endDate: new Date(query.endDate),
            };
        }
        const endDate = new Date();
        let startDate;
        switch (query.period) {
            case report_query_dto_1.PeriodType.DAILY:
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                break;
            case report_query_dto_1.PeriodType.WEEKLY:
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                break;
            case report_query_dto_1.PeriodType.MONTHLY:
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case report_query_dto_1.PeriodType.YEARLY:
                startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
        }
        return { startDate, endDate };
    }
};
exports.SalesReportService = SalesReportService;
exports.SalesReportService = SalesReportService = SalesReportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SalesReportService);
//# sourceMappingURL=sales-report.service.js.map