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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const sales_report_service_1 = require("./services/sales-report.service");
const product_report_service_1 = require("./services/product-report.service");
const customer_report_service_1 = require("./services/customer-report.service");
const export_service_1 = require("./services/export.service");
const inventory_report_service_1 = require("./services/inventory-report.service");
const report_query_dto_1 = require("./dto/report-query.dto");
const sales_report_dto_1 = require("./dto/sales-report.dto");
const product_report_dto_1 = require("./dto/product-report.dto");
const customer_report_dto_1 = require("./dto/customer-report.dto");
let ReportsController = class ReportsController {
    constructor(salesReportService, productReportService, customerReportService, inventoryReportService, exportService) {
        this.salesReportService = salesReportService;
        this.productReportService = productReportService;
        this.customerReportService = customerReportService;
        this.inventoryReportService = inventoryReportService;
        this.exportService = exportService;
    }
    async getSalesSummary(user, query) {
        return this.salesReportService.getSalesSummary(user.companyId, query);
    }
    async getSalesByPeriod(user, query) {
        return this.salesReportService.getSalesByPeriod(user.companyId, query);
    }
    async getRevenueTrends(user, query) {
        return this.salesReportService.getRevenueTrends(user.companyId, query);
    }
    async getTopSellingProducts(user, query) {
        return this.productReportService.getTopSellingProducts(user.companyId, query);
    }
    async getLowStockProducts(user, query) {
        return this.productReportService.getLowStockProducts(user.companyId, query);
    }
    async getProductReport(user, query) {
        return this.productReportService.getProductReport(user.companyId, query);
    }
    async getInventoryTurnover(user, query) {
        return this.productReportService.getInventoryTurnover(user.companyId, query);
    }
    async getInventoryValueByWarehouse(user) {
        return this.inventoryReportService.getInventoryValueByWarehouse(user.companyId);
    }
    async getTopCustomers(user, query) {
        return this.customerReportService.getTopCustomers(user.companyId, query);
    }
    async getCustomerSegments(user, query) {
        return this.customerReportService.getCustomerSegments(user.companyId, query);
    }
    async getCustomerReport(user, query) {
        return this.customerReportService.getCustomerReport(user.companyId, query);
    }
    async exportSalesReport(user, query, res) {
        const data = await this.salesReportService.getSalesByPeriod(user.companyId, query);
        try {
            const { buffer, filename, mimeType } = await this.exportService.export(data, query.format, query.filename || 'sales-report');
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        }
        catch (error) {
            res.status(common_1.HttpStatus.NOT_IMPLEMENTED).json({
                statusCode: common_1.HttpStatus.NOT_IMPLEMENTED,
                message: error.message,
                error: 'Not Implemented',
            });
        }
    }
    async exportProductReport(user, query, res) {
        const data = await this.productReportService.getProductReport(user.companyId, query);
        try {
            const { buffer, filename, mimeType } = await this.exportService.export(data, query.format, query.filename || 'product-report');
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        }
        catch (error) {
            res.status(common_1.HttpStatus.NOT_IMPLEMENTED).json({
                statusCode: common_1.HttpStatus.NOT_IMPLEMENTED,
                message: error.message,
                error: 'Not Implemented',
            });
        }
    }
    async exportCustomerReport(user, query, res) {
        const data = await this.customerReportService.getCustomerReport(user.companyId, query);
        try {
            const { buffer, filename, mimeType } = await this.exportService.export(data, query.format, query.filename || 'customer-report');
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        }
        catch (error) {
            res.status(common_1.HttpStatus.NOT_IMPLEMENTED).json({
                statusCode: common_1.HttpStatus.NOT_IMPLEMENTED,
                message: error.message,
                error: 'Not Implemented',
            });
        }
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('sales/summary'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get sales summary report' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: sales_report_dto_1.SalesSummaryDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getSalesSummary", null);
__decorate([
    (0, common_1.Get)('sales/by-period'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed sales report by period' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: sales_report_dto_1.SalesReportDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getSalesByPeriod", null);
__decorate([
    (0, common_1.Get)('revenue/trends'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get revenue trends and payment method breakdown' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: sales_report_dto_1.RevenueTrendsDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getRevenueTrends", null);
__decorate([
    (0, common_1.Get)('products/top-selling'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top selling products' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getTopSellingProducts", null);
__decorate([
    (0, common_1.Get)('products/low-stock'),
    (0, roles_decorator_1.Roles)('admin', 'manager', 'staff'),
    (0, swagger_1.ApiOperation)({ summary: 'Get products with low stock levels' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getLowStockProducts", null);
__decorate([
    (0, common_1.Get)('products/report'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get comprehensive product report' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: product_report_dto_1.ProductReportDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getProductReport", null);
__decorate([
    (0, common_1.Get)('inventory/turnover'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory turnover analysis' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: product_report_dto_1.InventoryReportDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getInventoryTurnover", null);
__decorate([
    (0, common_1.Get)('inventory/value-by-warehouse'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory value grouped by warehouse' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getInventoryValueByWarehouse", null);
__decorate([
    (0, common_1.Get)('customers/top-buyers'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top buying customers' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getTopCustomers", null);
__decorate([
    (0, common_1.Get)('customers/segments'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer segmentation analysis' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getCustomerSegments", null);
__decorate([
    (0, common_1.Get)('customers/report'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get comprehensive customer report' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: customer_report_dto_1.CustomerReportDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getCustomerReport", null);
__decorate([
    (0, common_1.Get)('export/sales'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Export sales report to PDF/Excel/CSV' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportSalesReport", null);
__decorate([
    (0, common_1.Get)('export/products'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Export product report to PDF/Excel/CSV' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportProductReport", null);
__decorate([
    (0, common_1.Get)('export/customers'),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Export customer report to PDF/Excel/CSV' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, report_query_dto_1.ExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportCustomerReport", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [sales_report_service_1.SalesReportService,
        product_report_service_1.ProductReportService,
        customer_report_service_1.CustomerReportService,
        inventory_report_service_1.InventoryReportService,
        export_service_1.ExportService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map