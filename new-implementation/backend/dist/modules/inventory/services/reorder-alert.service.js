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
var ReorderAlertService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReorderAlertService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const stock_calculator_service_1 = require("./stock-calculator.service");
const warehouse_location_entity_1 = require("../entities/warehouse-location.entity");
let ReorderAlertService = ReorderAlertService_1 = class ReorderAlertService {
    constructor(locationRepository, stockCalculator) {
        this.locationRepository = locationRepository;
        this.stockCalculator = stockCalculator;
        this.logger = new common_1.Logger(ReorderAlertService_1.name);
    }
    async checkReorderLevels(companyId, reorderThreshold = 10) {
        const locations = await this.locationRepository.find({
            where: { company_id: companyId, is_active: true },
        });
        const alerts = [];
        for (const location of locations) {
            if (location.current_stock <= reorderThreshold) {
                alerts.push({
                    product_id: location.id,
                    location_id: location.id,
                    stock: location.current_stock,
                });
            }
        }
        if (alerts.length > 0) {
            this.logger.warn(`Reorder alerts: ${alerts.length} items low on stock`);
        }
        return alerts;
    }
};
exports.ReorderAlertService = ReorderAlertService;
exports.ReorderAlertService = ReorderAlertService = ReorderAlertService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(warehouse_location_entity_1.WarehouseLocation)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        stock_calculator_service_1.StockCalculatorService])
], ReorderAlertService);
//# sourceMappingURL=reorder-alert.service.js.map