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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueTrendsDto = exports.RevenueByPaymentMethodDto = exports.SalesReportDto = exports.SalesByPeriodDto = exports.SalesSummaryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class SalesSummaryDto {
}
exports.SalesSummaryDto = SalesSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SalesSummaryDto.prototype, "totalSales", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SalesSummaryDto.prototype, "totalRevenue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SalesSummaryDto.prototype, "totalProfit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SalesSummaryDto.prototype, "averageTicket", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SalesSummaryDto.prototype, "totalItems", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SalesSummaryDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], SalesSummaryDto.prototype, "comparedToLastPeriod", void 0);
class SalesByPeriodDto {
}
exports.SalesByPeriodDto = SalesByPeriodDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SalesByPeriodDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SalesByPeriodDto.prototype, "totalSales", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SalesByPeriodDto.prototype, "totalRevenue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SalesByPeriodDto.prototype, "totalItems", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], SalesByPeriodDto.prototype, "averageTicket", void 0);
class SalesReportDto {
}
exports.SalesReportDto = SalesReportDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", SalesSummaryDto)
], SalesReportDto.prototype, "summary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [SalesByPeriodDto] }),
    __metadata("design:type", Array)
], SalesReportDto.prototype, "periodData", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], SalesReportDto.prototype, "generatedAt", void 0);
class RevenueByPaymentMethodDto {
}
exports.RevenueByPaymentMethodDto = RevenueByPaymentMethodDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RevenueByPaymentMethodDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RevenueByPaymentMethodDto.prototype, "totalRevenue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RevenueByPaymentMethodDto.prototype, "transactionCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RevenueByPaymentMethodDto.prototype, "percentage", void 0);
class RevenueTrendsDto {
}
exports.RevenueTrendsDto = RevenueTrendsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [SalesByPeriodDto] }),
    __metadata("design:type", Array)
], RevenueTrendsDto.prototype, "trends", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [RevenueByPaymentMethodDto] }),
    __metadata("design:type", Array)
], RevenueTrendsDto.prototype, "byPaymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RevenueTrendsDto.prototype, "totalRevenue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], RevenueTrendsDto.prototype, "generatedAt", void 0);
//# sourceMappingURL=sales-report.dto.js.map