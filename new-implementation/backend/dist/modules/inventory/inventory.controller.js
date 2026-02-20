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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const stock_service_1 = require("./services/stock.service");
const warehouse_service_1 = require("./services/warehouse.service");
const movement_service_1 = require("./services/movement.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const adjust_stock_dto_1 = require("./dto/adjust-stock.dto");
const movement_query_dto_1 = require("./dto/movement-query.dto");
const create_warehouse_dto_1 = require("./dto/create-warehouse.dto");
const create_location_dto_1 = require("./dto/create-location.dto");
let InventoryController = class InventoryController {
    constructor(stockService, warehouseService, movementService) {
        this.stockService = stockService;
        this.warehouseService = warehouseService;
        this.movementService = movementService;
    }
    async getStock(user) {
        return this.stockService.getCurrentStock(user);
    }
    async getStockByProduct(productId, user) {
        return this.stockService.getStockByProduct(productId, user);
    }
    async adjustStock(dto, user) {
        return this.stockService.adjustStock(dto, user);
    }
    async listMovements(query, user) {
        return this.movementService.listMovements(query, user);
    }
    async getMovement(id, user) {
        return this.movementService.getMovementById(id, user);
    }
    async listWarehouses(user) {
        return this.warehouseService.listWarehouses(user);
    }
    async createWarehouse(dto, user) {
        return this.warehouseService.createWarehouse(dto, user);
    }
    async getWarehouse(id, user) {
        return this.warehouseService.getWarehouseById(id, user);
    }
    async updateWarehouse(id, dto, user) {
        return this.warehouseService.updateWarehouse(id, dto, user);
    }
    async createLocation(dto, user) {
        return this.warehouseService.createLocation(dto, user);
    }
    async updateLocation(id, dto, user) {
        return this.warehouseService.updateLocation(id, dto, user);
    }
    async listLocations(warehouseId, user) {
        return this.warehouseService.listLocations(warehouseId, user);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('stock'),
    (0, roles_decorator_1.Roles)('inventory_manager', 'manager', 'admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getStock", null);
__decorate([
    (0, common_1.Get)('stock/:product_id'),
    (0, roles_decorator_1.Roles)('inventory_manager', 'manager', 'admin'),
    __param(0, (0, common_1.Param)('product_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getStockByProduct", null);
__decorate([
    (0, common_1.Post)('adjust'),
    (0, roles_decorator_1.Roles)('inventory_manager', 'manager'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [adjust_stock_dto_1.AdjustStockDto, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "adjustStock", null);
__decorate([
    (0, common_1.Get)('movements'),
    (0, roles_decorator_1.Roles)('inventory_manager', 'manager', 'admin'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [movement_query_dto_1.MovementQueryDto, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "listMovements", null);
__decorate([
    (0, common_1.Get)('movements/:id'),
    (0, roles_decorator_1.Roles)('inventory_manager', 'manager', 'admin'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getMovement", null);
__decorate([
    (0, common_1.Get)('warehouses'),
    (0, roles_decorator_1.Roles)('inventory_manager', 'manager', 'admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "listWarehouses", null);
__decorate([
    (0, common_1.Post)('warehouses'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_warehouse_dto_1.CreateWarehouseDto, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createWarehouse", null);
__decorate([
    (0, common_1.Get)('warehouses/:id'),
    (0, roles_decorator_1.Roles)('inventory_manager', 'manager', 'admin'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getWarehouse", null);
__decorate([
    (0, common_1.Put)('warehouses/:id'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateWarehouse", null);
__decorate([
    (0, common_1.Post)('locations'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_location_dto_1.CreateLocationDto, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createLocation", null);
__decorate([
    (0, common_1.Put)('locations/:id'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateLocation", null);
__decorate([
    (0, common_1.Get)('locations/:warehouse_id'),
    (0, roles_decorator_1.Roles)('inventory_manager', 'manager', 'admin'),
    __param(0, (0, common_1.Param)('warehouse_id', new common_1.ParseUUIDPipe())),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "listLocations", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [stock_service_1.StockService,
        warehouse_service_1.WarehouseService,
        movement_service_1.MovementService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map