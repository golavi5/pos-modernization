"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ExportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const common_1 = require("@nestjs/common");
const report_query_dto_1 = require("../dto/report-query.dto");
let ExportService = ExportService_1 = class ExportService {
    constructor() {
        this.logger = new common_1.Logger(ExportService_1.name);
    }
    async exportToPDF(data, filename) {
        this.logger.warn('PDF export not implemented yet. Install pdfkit library.');
        throw new common_1.NotImplementedException('PDF export requires pdfkit library. Run: npm install pdfkit @types/pdfkit');
    }
    async exportToExcel(data, filename) {
        this.logger.warn('Excel export not implemented yet. Install exceljs library.');
        throw new common_1.NotImplementedException('Excel export requires exceljs library. Run: npm install exceljs');
    }
    async exportToCSV(data, filename) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Data must be a non-empty array for CSV export');
        }
        const headers = Object.keys(data[0]);
        let csv = headers.join(',') + '\n';
        data.forEach((row) => {
            const values = headers.map((header) => {
                const value = row[header];
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value ?? '';
            });
            csv += values.join(',') + '\n';
        });
        const buffer = Buffer.from(csv, 'utf-8');
        return { buffer, filename: `${filename}.csv` };
    }
    async export(data, format, filename = 'report') {
        let result;
        let mimeType;
        switch (format) {
            case report_query_dto_1.ExportFormat.PDF:
                result = await this.exportToPDF(data, filename);
                mimeType = 'application/pdf';
                break;
            case report_query_dto_1.ExportFormat.EXCEL:
                result = await this.exportToExcel(data, filename);
                mimeType =
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                break;
            case report_query_dto_1.ExportFormat.CSV:
                result = await this.exportToCSV(data, filename);
                mimeType = 'text/csv';
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
        return { ...result, mimeType };
    }
};
exports.ExportService = ExportService;
exports.ExportService = ExportService = ExportService_1 = __decorate([
    (0, common_1.Injectable)()
], ExportService);
//# sourceMappingURL=export.service.js.map