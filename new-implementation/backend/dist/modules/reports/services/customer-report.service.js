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
var CustomerReportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerReportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("../../customers/customer.entity");
const order_entity_1 = require("../../sales/entities/order.entity");
let CustomerReportService = CustomerReportService_1 = class CustomerReportService {
    constructor(customerRepository, orderRepository) {
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
        this.logger = new common_1.Logger(CustomerReportService_1.name);
    }
    async getTopCustomers(companyId, query) {
        const { startDate, endDate } = this.getDateRange(query);
        const limit = query.limit || 10;
        const results = await this.orderRepository
            .createQueryBuilder('order')
            .innerJoin(customer_entity_1.Customer, 'customer', 'customer.id = order.customer_id')
            .select('customer.id', 'customerId')
            .addSelect('customer.name', 'customerName')
            .addSelect('customer.email', 'email')
            .addSelect('customer.phone', 'phone')
            .addSelect('customer.loyalty_points', 'loyaltyPoints')
            .addSelect('COUNT(order.id)', 'totalPurchases')
            .addSelect('SUM(order.total_amount)', 'totalSpent')
            .addSelect('AVG(order.total_amount)', 'averageTicket')
            .addSelect('MAX(order.created_at)', 'lastPurchaseDate')
            .where('order.company_id = :companyId', { companyId })
            .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
        })
            .andWhere('order.customer_id IS NOT NULL')
            .groupBy('customer.id')
            .orderBy('totalSpent', 'DESC')
            .limit(limit)
            .getRawMany();
        return results.map((row) => ({
            customerId: row.customerId,
            customerName: row.customerName,
            email: row.email,
            phone: row.phone,
            totalPurchases: parseInt(row.totalPurchases || '0'),
            totalSpent: parseFloat(row.totalSpent || '0'),
            averageTicket: parseFloat(row.averageTicket || '0'),
            lastPurchaseDate: row.lastPurchaseDate
                ? new Date(row.lastPurchaseDate)
                : null,
            loyaltyPoints: parseInt(row.loyaltyPoints || '0'),
        }));
    }
    async getCustomerSegments(companyId, query) {
        const customers = await this.customerRepository
            .createQueryBuilder('customer')
            .leftJoin(order_entity_1.Order, 'order', 'order.customer_id = customer.id')
            .select('customer.id', 'customerId')
            .addSelect('customer.created_at', 'registrationDate')
            .addSelect('COUNT(order.id)', 'totalPurchases')
            .addSelect('SUM(order.total_amount)', 'totalSpent')
            .addSelect('MAX(order.created_at)', 'lastPurchaseDate')
            .where('customer.company_id = :companyId', { companyId })
            .groupBy('customer.id')
            .getRawMany();
        const segments = {
            vip: { customers: [], revenue: 0 },
            regular: { customers: [], revenue: 0 },
            new: { customers: [], revenue: 0 },
            inactive: { customers: [], revenue: 0 },
        };
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        customers.forEach((customer) => {
            const totalPurchases = parseInt(customer.totalPurchases) || 0;
            const totalSpent = parseFloat(customer.totalSpent) || 0;
            const lastPurchase = customer.lastPurchaseDate
                ? new Date(customer.lastPurchaseDate)
                : null;
            const registrationDate = new Date(customer.registrationDate);
            if (totalSpent >= 1000 || totalPurchases >= 10) {
                segments.vip.customers.push(customer);
                segments.vip.revenue += totalSpent;
            }
            else if (!lastPurchase || lastPurchase < ninetyDaysAgo) {
                segments.inactive.customers.push(customer);
                segments.inactive.revenue += totalSpent;
            }
            else if (registrationDate >= thirtyDaysAgo) {
                segments.new.customers.push(customer);
                segments.new.revenue += totalSpent;
            }
            else {
                segments.regular.customers.push(customer);
                segments.regular.revenue += totalSpent;
            }
        });
        const totalCustomers = customers.length;
        return [
            {
                segment: 'VIP',
                customerCount: segments.vip.customers.length,
                totalRevenue: segments.vip.revenue,
                averageSpent: segments.vip.customers.length > 0
                    ? segments.vip.revenue / segments.vip.customers.length
                    : 0,
                percentage: totalCustomers > 0
                    ? (segments.vip.customers.length / totalCustomers) * 100
                    : 0,
            },
            {
                segment: 'Regular',
                customerCount: segments.regular.customers.length,
                totalRevenue: segments.regular.revenue,
                averageSpent: segments.regular.customers.length > 0
                    ? segments.regular.revenue / segments.regular.customers.length
                    : 0,
                percentage: totalCustomers > 0
                    ? (segments.regular.customers.length / totalCustomers) * 100
                    : 0,
            },
            {
                segment: 'New',
                customerCount: segments.new.customers.length,
                totalRevenue: segments.new.revenue,
                averageSpent: segments.new.customers.length > 0
                    ? segments.new.revenue / segments.new.customers.length
                    : 0,
                percentage: totalCustomers > 0
                    ? (segments.new.customers.length / totalCustomers) * 100
                    : 0,
            },
            {
                segment: 'Inactive',
                customerCount: segments.inactive.customers.length,
                totalRevenue: segments.inactive.revenue,
                averageSpent: segments.inactive.customers.length > 0
                    ? segments.inactive.revenue / segments.inactive.customers.length
                    : 0,
                percentage: totalCustomers > 0
                    ? (segments.inactive.customers.length / totalCustomers) * 100
                    : 0,
            },
        ];
    }
    async getCustomerReport(companyId, query) {
        const { startDate, endDate } = this.getDateRange(query);
        const topBuyers = await this.getTopCustomers(companyId, query);
        const segments = await this.getCustomerSegments(companyId, query);
        const totalCustomers = await this.customerRepository.count({
            where: { company_id: companyId },
        });
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeCustomers = await this.orderRepository
            .createQueryBuilder('order')
            .select('COUNT(DISTINCT order.customer_id)', 'count')
            .where('order.company_id = :companyId', { companyId })
            .andWhere('order.created_at >= :date', { date: thirtyDaysAgo })
            .andWhere('order.customer_id IS NOT NULL')
            .getRawOne();
        const newCustomers = await this.customerRepository.count({
            where: {
                company_id: companyId,
                created_at: (0, typeorm_2.Between)(startDate, endDate),
            },
        });
        return {
            topBuyers,
            segments,
            totalCustomers,
            activeCustomers: parseInt(activeCustomers?.count) || 0,
            newCustomers,
            generatedAt: new Date(),
        };
    }
    getDateRange(query) {
        if (query.startDate && query.endDate) {
            return {
                startDate: new Date(query.startDate),
                endDate: new Date(query.endDate),
            };
        }
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        return { startDate, endDate };
    }
};
exports.CustomerReportService = CustomerReportService;
exports.CustomerReportService = CustomerReportService = CustomerReportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CustomerReportService);
//# sourceMappingURL=customer-report.service.js.map