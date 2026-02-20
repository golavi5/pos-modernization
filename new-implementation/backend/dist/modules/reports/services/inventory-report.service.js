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
var InventoryReportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryReportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const stock_movement_entity_1 = require("../../inventory/entities/stock-movement.entity");
const warehouse_entity_1 = require("../../inventory/entities/warehouse.entity");
const product_entity_1 = require("../../products/entities/product.entity");
let InventoryReportService = InventoryReportService_1 = class InventoryReportService {
    constructor(stockMovementRepository, warehouseRepository, productRepository) {
        this.stockMovementRepository = stockMovementRepository;
        this.warehouseRepository = warehouseRepository;
        this.productRepository = productRepository;
        this.logger = new common_1.Logger(InventoryReportService_1.name);
    }
    async getInventoryValueByWarehouse(companyId) {
        const warehouses = await this.warehouseRepository.find({
            where: { company_id: companyId },
        });
        return warehouses.map((warehouse) => ({
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            productCount: 0,
            totalUnits: 0,
            totalValue: 0,
        }));
    }
    async getStockMovementSummary(companyId, startDate, endDate) {
        const results = await this.stockMovementRepository
            .createQueryBuilder('movement')
            .select('movement.movement_type', 'type')
            .addSelect('COUNT(*)', 'count')
            .addSelect('SUM(ABS(movement.quantity))', 'totalQuantity')
            .where('movement.company_id = :companyId', { companyId })
            .andWhere('movement.created_at BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
        })
            .groupBy('movement.movement_type')
            .getRawMany();
        return results.map((row) => ({
            type: row.type,
            count: parseInt(row.count),
            totalQuantity: parseInt(row.totalQuantity || '0'),
        }));
    }
    async getLowStockProducts(companyId) {
        const products = await this.productRepository.find({
            where: {
                company_id: companyId,
                is_active: true,
            },
        });
        return products
            .filter((p) => p.stock_quantity <= p.reorder_level)
            .map((product) => ({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            currentStock: product.stock_quantity,
            reorderLevel: product.reorder_level,
            stockLevel: product.stock_quantity === 0
                ? 'critical'
                : product.stock_quantity <= product.reorder_level * 0.5
                    ? 'critical'
                    : 'low',
        }));
    }
};
exports.InventoryReportService = InventoryReportService;
exports.InventoryReportService = InventoryReportService = InventoryReportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(stock_movement_entity_1.StockMovement)),
    __param(1, (0, typeorm_1.InjectRepository)(warehouse_entity_1.Warehouse)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], InventoryReportService);
//# sourceMappingURL=inventory-report.service.js.map