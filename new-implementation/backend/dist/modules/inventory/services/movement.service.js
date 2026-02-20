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
exports.MovementService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const stock_movement_entity_1 = require("../entities/stock-movement.entity");
const warehouse_location_entity_1 = require("../entities/warehouse-location.entity");
let MovementService = class MovementService {
    constructor(movementRepository, locationRepository) {
        this.movementRepository = movementRepository;
        this.locationRepository = locationRepository;
    }
    async listMovements(query, user) {
        const where = { company_id: user.company_id };
        if (query.product_id) {
            where.product_id = query.product_id;
        }
        if (query.location_id) {
            where.location_id = query.location_id;
        }
        if (query.movement_type) {
            where.movement_type = query.movement_type;
        }
        if (query.start_date && query.end_date) {
            where.created_at = (0, typeorm_2.Between)(new Date(query.start_date), new Date(query.end_date));
        }
        const [movements, total] = await this.movementRepository.findAndCount({
            where,
            order: { created_at: 'DESC' },
            skip: ((query.page || 1) - 1) * (query.limit || 10),
            take: query.limit || 10,
        });
        return { movements, total };
    }
    async getMovementById(id, user) {
        const movement = await this.movementRepository.findOne({
            where: { id, company_id: user.company_id },
            relations: ['location'],
        });
        if (!movement) {
            throw new common_1.NotFoundException('Movement not found');
        }
        return movement;
    }
    async recordMovement(productId, locationId, movementType, quantity, user, referenceId, notes) {
        const location = await this.locationRepository.findOne({
            where: { id: locationId, company_id: user.company_id },
        });
        if (!location) {
            throw new common_1.NotFoundException('Location not found');
        }
        if (quantity <= 0) {
            throw new common_1.BadRequestException('Quantity must be greater than 0');
        }
        const movement = this.movementRepository.create({
            product_id: productId,
            location_id: locationId,
            company_id: user.company_id,
            movement_type: movementType,
            quantity,
            reference_id: referenceId,
            notes,
            created_by: user.id,
        });
        return await this.movementRepository.save(movement);
    }
};
exports.MovementService = MovementService;
exports.MovementService = MovementService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(stock_movement_entity_1.StockMovement)),
    __param(1, (0, typeorm_1.InjectRepository)(warehouse_location_entity_1.WarehouseLocation)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], MovementService);
//# sourceMappingURL=movement.service.js.map