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
var StockService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const warehouse_location_entity_1 = require("../entities/warehouse-location.entity");
const stock_movement_entity_1 = require("../entities/stock-movement.entity");
const stock_calculator_service_1 = require("./stock-calculator.service");
let StockService = StockService_1 = class StockService {
    constructor(locationRepository, movementRepository, stockCalculator) {
        this.locationRepository = locationRepository;
        this.movementRepository = movementRepository;
        this.stockCalculator = stockCalculator;
        this.logger = new common_1.Logger(StockService_1.name);
    }
    async getCurrentStock(user) {
        const locations = await this.locationRepository.find({
            where: { company_id: user.company_id, is_active: true },
        });
        const stock = [];
        for (const location of locations) {
            stock.push({
                location_id: location.id,
                location_code: location.location_code,
                current_stock: location.current_stock,
                capacity: location.capacity,
                available_capacity: location.capacity - location.current_stock,
            });
        }
        return stock;
    }
    async getStockByProduct(productId, user) {
        const locations = await this.locationRepository.find({
            where: { company_id: user.company_id, is_active: true },
        });
        const stock = [];
        for (const location of locations) {
            const quantity = await this.stockCalculator.calculateCurrentStock(productId, location.id);
            if (quantity > 0) {
                stock.push({
                    location_id: location.id,
                    location_code: location.location_code,
                    quantity,
                });
            }
        }
        return stock;
    }
    async adjustStock(dto, user) {
        const location = await this.locationRepository.findOne({
            where: { id: dto.location_id, company_id: user.company_id },
        });
        if (!location) {
            throw new common_1.NotFoundException('Location not found');
        }
        if (dto.quantity <= 0) {
            throw new common_1.BadRequestException('Quantity must be greater than 0');
        }
        let newStock = location.current_stock;
        if (dto.movement_type === stock_movement_entity_1.MovementType.IN ||
            dto.movement_type === stock_movement_entity_1.MovementType.RETURN) {
            newStock += dto.quantity;
        }
        else {
            newStock -= dto.quantity;
        }
        if (newStock < 0) {
            throw new common_1.BadRequestException('Insufficient stock for this operation');
        }
        if (newStock > location.capacity) {
            throw new common_1.BadRequestException('Stock exceeds location capacity');
        }
        const movement = this.movementRepository.create({
            product_id: dto.product_id,
            location_id: dto.location_id,
            company_id: user.company_id,
            movement_type: dto.movement_type,
            quantity: dto.quantity,
            reference_id: dto.reference_id,
            notes: dto.notes,
            created_by: user.id,
        });
        const saved = await this.movementRepository.save(movement);
        location.current_stock = newStock;
        await this.locationRepository.save(location);
        this.logger.log(`Stock adjusted: ${dto.product_id} in ${location.location_code} by ${user.id}`);
        return saved;
    }
    async deductStockOnOrder(productId, quantity, user, orderId) {
        const dto = {
            product_id: productId,
            location_id: '',
            movement_type: stock_movement_entity_1.MovementType.OUT,
            quantity,
            reference_id: orderId,
            notes: `Order ${orderId}`,
        };
        const locations = await this.locationRepository.find({
            where: { company_id: user.company_id, is_active: true },
            order: { current_stock: 'DESC' },
        });
        for (const location of locations) {
            if (location.current_stock >= quantity) {
                dto.location_id = location.id;
                await this.adjustStock(dto, user);
                return;
            }
        }
        throw new common_1.BadRequestException('Insufficient stock available');
    }
};
exports.StockService = StockService;
exports.StockService = StockService = StockService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(warehouse_location_entity_1.WarehouseLocation)),
    __param(1, (0, typeorm_1.InjectRepository)(stock_movement_entity_1.StockMovement)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        stock_calculator_service_1.StockCalculatorService])
], StockService);
//# sourceMappingURL=stock.service.js.map