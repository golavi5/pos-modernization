"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const reports_controller_1 = require("./reports.controller");
const sales_report_service_1 = require("./services/sales-report.service");
const product_report_service_1 = require("./services/product-report.service");
const inventory_report_service_1 = require("./services/inventory-report.service");
const customer_report_service_1 = require("./services/customer-report.service");
const export_service_1 = require("./services/export.service");
const order_entity_1 = require("../sales/entities/order.entity");
const order_item_entity_1 = require("../sales/entities/order-item.entity");
const product_entity_1 = require("../products/entities/product.entity");
const customer_entity_1 = require("../customers/customer.entity");
const stock_movement_entity_1 = require("../inventory/entities/stock-movement.entity");
const warehouse_entity_1 = require("../inventory/entities/warehouse.entity");
let ReportsModule = class ReportsModule {
};
exports.ReportsModule = ReportsModule;
exports.ReportsModule = ReportsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                order_entity_1.Order,
                order_item_entity_1.OrderItem,
                product_entity_1.Product,
                customer_entity_1.Customer,
                stock_movement_entity_1.StockMovement,
                warehouse_entity_1.Warehouse,
            ]),
        ],
        controllers: [reports_controller_1.ReportsController],
        providers: [
            sales_report_service_1.SalesReportService,
            product_report_service_1.ProductReportService,
            inventory_report_service_1.InventoryReportService,
            customer_report_service_1.CustomerReportService,
            export_service_1.ExportService,
        ],
        exports: [
            sales_report_service_1.SalesReportService,
            product_report_service_1.ProductReportService,
            inventory_report_service_1.InventoryReportService,
            customer_report_service_1.CustomerReportService,
            export_service_1.ExportService,
        ],
    })
], ReportsModule);
//# sourceMappingURL=reports.module.js.map