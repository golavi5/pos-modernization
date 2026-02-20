export declare enum PeriodType {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly",
    CUSTOM = "custom"
}
export declare enum ExportFormat {
    PDF = "pdf",
    EXCEL = "excel",
    CSV = "csv"
}
export declare class ReportQueryDto {
    period?: PeriodType;
    startDate?: string;
    endDate?: string;
    limit?: number;
    warehouseId?: number;
    categoryId?: number;
}
export declare class ExportQueryDto extends ReportQueryDto {
    format?: ExportFormat;
    filename?: string;
}
