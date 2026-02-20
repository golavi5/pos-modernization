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
var ProductReportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductReportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("../../products/entities/product.entity");
const order_item_entity_1 = require("../../sales/entities/order-item.entity");
const order_entity_1 = require("../../sales/entities/order.entity");
const stock_movement_entity_1 = require("../../inventory/entities/stock-movement.entity");
let ProductReportService = ProductReportService_1 = class ProductReportService {
    constructor(productRepository, orderItemRepository, orderRepository, stockMovementRepository) {
        this.productRepository = productRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderRepository = orderRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.logger = new common_1.Logger(ProductReportService_1.name);
    }
    async getTopSellingProducts(companyId, query) {
        const { startDate, endDate } = this.getDateRange(query);
        const limit = query.limit || 10;
        const results = await this.orderItemRepository
            .createQueryBuilder('item')
            .innerJoin('item.order', 'order')
            .innerJoin('item.product', 'product')
            .select('product.id', 'productId')
            .addSelect('product.name', 'productName')
            .addSelect('product.sku', 'sku')
            .addSelect('SUM(item.quantity)', 'totalQuantitySold')
            .addSelect('SUM(item.subtotal)', 'totalRevenue')
            .addSelect('AVG(item.unit_price)', 'averagePrice')
            .addSelect('COUNT(DISTINCT order.id)', 'transactionCount')
            .where('order.company_id = :companyId', { companyId })
            .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
        })
            .groupBy('product.id')
            .orderBy('totalQuantitySold', 'DESC')
            .limit(limit)
            .getRawMany();
        return results.map((row) => ({
            productId: row.productId,
            productName: row.productName,
            sku: row.sku,
            category: 'Sin categor\u00eda',
            totalQuantitySold: parseInt(row.totalQuantitySold || '0'),
            totalRevenue: parseFloat(row.totalRevenue || '0'),
            averagePrice: parseFloat(row.averagePrice || '0'),
            transactionCount: parseInt(row.transactionCount || '0'),
        }));
    }
    async getLowStockProducts(companyId, query) {
        const products = await this.productRepository.find({
            where: {
                company_id: companyId,
                is_active: true,
            },
            order: { stock_quantity: 'ASC' },
            take: query.limit || 50,
        });
        return products
            .filter((p) => p.stock_quantity <= p.reorder_level)
            .map((product) => {
            let stockLevel;
            if (product.stock_quantity === 0) {
                stockLevel = 'critical';
            }
            else if (product.stock_quantity <= product.reorder_level * 0.5) {
                stockLevel = 'critical';
            }
            else {
                stockLevel = 'low';
            }
            return {
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                currentStock: product.stock_quantity,
                reorderPoint: product.reorder_level,
                stockLevel,
                warehouseName: 'Default',
                daysUntilStockout: undefined,
            };
        });
    }
    async getInventoryTurnover(companyId, query) {
        const { startDate, endDate } = this.getDateRange(query);
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const products = await this.productRepository.find({
            where: { company_id: companyId },
        });
        const turnoverData = [];
        for (const product of products) {
            const totalSold = await this.calculateTotalSold(product.id, startDate, endDate);
            const averageStock = product.stock_quantity;
            const turnoverRate = averageStock > 0 ? totalSold / averageStock : 0;
            const daysOfInventory = turnoverRate > 0 ? periodDays / turnoverRate : 999;
            let status;
            if (turnoverRate >= 4) {
                status = 'fast-moving';
            }
            else if (turnoverRate >= 1) {
                status = 'slow-moving';
            }
            else {
                status = 'dead-stock';
            }
            turnoverData.push({
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                averageStock,
                totalSold,
                turnoverRate,
                daysOfInventory,
                category: 'Sin categor\u00eda',
                status,
            });
        }
        turnoverData.sort((a, b) => b.turnoverRate - a.turnoverRate);
        const averageTurnoverRate = turnoverData.length > 0
            ? turnoverData.reduce((sum, item) => sum + item.turnoverRate, 0) /
                turnoverData.length
            : 0;
        return {
            turnover: turnoverData.slice(0, query.limit || 50),
            averageTurnoverRate,
            totalProducts: turnoverData.length,
            fastMovingCount: turnoverData.filter((i) => i.status === 'fast-moving')
                .length,
            slowMovingCount: turnoverData.filter((i) => i.status === 'slow-moving')
                .length,
            deadStockCount: turnoverData.filter((i) => i.status === 'dead-stock')
                .length,
            generatedAt: new Date(),
        };
    }
    async getProductReport(companyId, query) {
        const topSelling = await this.getTopSellingProducts(companyId, query);
        const lowStock = await this.getLowStockProducts(companyId, query);
        return {
            topSelling,
            lowStock,
            generatedAt: new Date(),
        };
    }
    async calculateTotalSold(productId, startDate, endDate) {
        const result = await this.orderItemRepository
            .createQueryBuilder('item')
            .innerJoin('item.order', 'order')
            .select('SUM(item.quantity)', 'total')
            .where('item.product_id = :productId', { productId })
            .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
        })
            .getRawOne();
        return parseInt(result?.total) || 0;
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
exports.ProductReportService = ProductReportService;
exports.ProductReportService = ProductReportService = ProductReportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __param(2, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(3, (0, typeorm_1.InjectRepository)(stock_movement_entity_1.StockMovement)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProductReportService);
//# sourceMappingURL=product-report.service.js.map