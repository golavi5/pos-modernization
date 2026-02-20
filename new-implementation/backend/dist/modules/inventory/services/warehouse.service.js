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
exports.WarehouseService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const warehouse_entity_1 = require("../entities/warehouse.entity");
const warehouse_location_entity_1 = require("../entities/warehouse-location.entity");
let WarehouseService = class WarehouseService {
    constructor(warehouseRepository, locationRepository) {
        this.warehouseRepository = warehouseRepository;
        this.locationRepository = locationRepository;
    }
    async listWarehouses(user) {
        return await this.warehouseRepository.find({
            where: { company_id: user.company_id, is_active: true },
            relations: ['locations'],
        });
    }
    async getWarehouseById(id, user) {
        const warehouse = await this.warehouseRepository.findOne({
            where: { id, company_id: user.company_id },
            relations: ['locations'],
        });
        if (!warehouse) {
            throw new common_1.NotFoundException('Warehouse not found');
        }
        return warehouse;
    }
    async createWarehouse(dto, user) {
        const warehouse = this.warehouseRepository.create({
            ...dto,
            company_id: user.company_id,
        });
        return await this.warehouseRepository.save(warehouse);
    }
    async updateWarehouse(id, dto, user) {
        const warehouse = await this.getWarehouseById(id, user);
        Object.assign(warehouse, dto);
        return await this.warehouseRepository.save(warehouse);
    }
    async createLocation(dto, user) {
        const warehouse = await this.getWarehouseById(dto.warehouse_id, user);
        if (!warehouse) {
            throw new common_1.BadRequestException('Warehouse not found');
        }
        const location = this.locationRepository.create({
            ...dto,
            company_id: user.company_id,
        });
        return await this.locationRepository.save(location);
    }
    async updateLocation(id, dto, user) {
        const location = await this.locationRepository.findOne({
            where: { id, company_id: user.company_id },
        });
        if (!location) {
            throw new common_1.NotFoundException('Location not found');
        }
        Object.assign(location, dto);
        return await this.locationRepository.save(location);
    }
    async listLocations(warehouseId, user) {
        return await this.locationRepository.find({
            where: {
                warehouse_id: warehouseId,
                company_id: user.company_id,
                is_active: true,
            },
        });
    }
};
exports.WarehouseService = WarehouseService;
exports.WarehouseService = WarehouseService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(warehouse_entity_1.Warehouse)),
    __param(1, (0, typeorm_1.InjectRepository)(warehouse_location_entity_1.WarehouseLocation)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], WarehouseService);
//# sourceMappingURL=warehouse.service.js.map