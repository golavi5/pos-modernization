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
exports.StockCalculatorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const warehouse_location_entity_1 = require("../entities/warehouse-location.entity");
const stock_movement_entity_1 = require("../entities/stock-movement.entity");
let StockCalculatorService = class StockCalculatorService {
    constructor(locationRepository, movementRepository) {
        this.locationRepository = locationRepository;
        this.movementRepository = movementRepository;
    }
    async calculateCurrentStock(productId, locationId) {
        const location = await this.locationRepository.findOne({
            where: { id: locationId },
        });
        if (!location) {
            return 0;
        }
        const movements = await this.movementRepository.find({
            where: {
                product_id: productId,
                location_id: locationId,
            },
        });
        let stock = 0;
        for (const movement of movements) {
            if (movement.movement_type === stock_movement_entity_1.MovementType.IN ||
                movement.movement_type === stock_movement_entity_1.MovementType.RETURN) {
                stock += movement.quantity;
            }
            else {
                stock -= movement.quantity;
            }
        }
        return Math.max(0, stock);
    }
    async getTotalStockByProduct(productId, companyId) {
        const locations = await this.locationRepository.find({
            where: { company_id: companyId },
        });
        let totalStock = 0;
        for (const location of locations) {
            const stock = await this.calculateCurrentStock(productId, location.id);
            totalStock += stock;
        }
        return totalStock;
    }
};
exports.StockCalculatorService = StockCalculatorService;
exports.StockCalculatorService = StockCalculatorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(warehouse_location_entity_1.WarehouseLocation)),
    __param(1, (0, typeorm_1.InjectRepository)(stock_movement_entity_1.StockMovement)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], StockCalculatorService);
//# sourceMappingURL=stock-calculator.service.js.map