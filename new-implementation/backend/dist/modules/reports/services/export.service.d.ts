import { ExportFormat } from '../dto/report-query.dto';
export declare class ExportService {
    private readonly logger;
    exportToPDF(data: any, filename: string): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
    exportToExcel(data: any, filename: string): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
    exportToCSV(data: any[], filename: string): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
    export(data: any, format: ExportFormat, filename?: string): Promise<{
        buffer: Buffer;
        filename: string;
        mimeType: string;
    }>;
}
