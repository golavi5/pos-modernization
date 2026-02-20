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
exports.ExportQueryDto = exports.ReportQueryDto = exports.ExportFormat = exports.PeriodType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var PeriodType;
(function (PeriodType) {
    PeriodType["DAILY"] = "daily";
    PeriodType["WEEKLY"] = "weekly";
    PeriodType["MONTHLY"] = "monthly";
    PeriodType["YEARLY"] = "yearly";
    PeriodType["CUSTOM"] = "custom";
})(PeriodType || (exports.PeriodType = PeriodType = {}));
var ExportFormat;
(function (ExportFormat) {
    ExportFormat["PDF"] = "pdf";
    ExportFormat["EXCEL"] = "excel";
    ExportFormat["CSV"] = "csv";
})(ExportFormat || (exports.ExportFormat = ExportFormat = {}));
class ReportQueryDto {
    constructor() {
        this.period = PeriodType.MONTHLY;
        this.limit = 10;
    }
}
exports.ReportQueryDto = ReportQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PeriodType, default: PeriodType.MONTHLY }),
    (0, class_validator_1.IsEnum)(PeriodType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReportQueryDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: '2026-01-01' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReportQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, example: '2026-12-31' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReportQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, default: 10 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ReportQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ReportQueryDto.prototype, "warehouseId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ReportQueryDto.prototype, "categoryId", void 0);
class ExportQueryDto extends ReportQueryDto {
    constructor() {
        super(...arguments);
        this.format = ExportFormat.PDF;
    }
}
exports.ExportQueryDto = ExportQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ExportFormat, default: ExportFormat.PDF }),
    (0, class_validator_1.IsEnum)(ExportFormat),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ExportQueryDto.prototype, "format", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ExportQueryDto.prototype, "filename", void 0);
//# sourceMappingURL=report-query.dto.js.map