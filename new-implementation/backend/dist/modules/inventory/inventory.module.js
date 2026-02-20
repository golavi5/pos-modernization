"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const inventory_controller_1 = require("./inventory.controller");
const stock_service_1 = require("./services/stock.service");
const warehouse_service_1 = require("./services/warehouse.service");
const movement_service_1 = require("./services/movement.service");
const stock_calculator_service_1 = require("./services/stock-calculator.service");
const reorder_alert_service_1 = require("./services/reorder-alert.service");
const warehouse_entity_1 = require("./entities/warehouse.entity");
const warehouse_location_entity_1 = require("./entities/warehouse-location.entity");
const stock_movement_entity_1 = require("./entities/stock-movement.entity");
const auth_module_1 = require("../auth/auth.module");
let InventoryModule = class InventoryModule {
};
exports.InventoryModule = InventoryModule;
exports.InventoryModule = InventoryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([warehouse_entity_1.Warehouse, warehouse_location_entity_1.WarehouseLocation, stock_movement_entity_1.StockMovement]),
            auth_module_1.AuthModule,
        ],
        controllers: [inventory_controller_1.InventoryController],
        providers: [
            stock_service_1.StockService,
            warehouse_service_1.WarehouseService,
            movement_service_1.MovementService,
            stock_calculator_service_1.StockCalculatorService,
            reorder_alert_service_1.ReorderAlertService,
        ],
        exports: [stock_service_1.StockService, warehouse_service_1.WarehouseService, movement_service_1.MovementService],
    })
], InventoryModule);
//# sourceMappingURL=inventory.module.js.map