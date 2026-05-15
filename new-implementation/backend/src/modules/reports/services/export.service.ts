import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import { ExportFormat } from '../dto/report-query.dto';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  async exportToPDF(
    data: any,
    filename: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () =>
        resolve({ buffer: Buffer.concat(chunks), filename: `${filename}.pdf` }),
      );
      doc.on('error', reject);

      doc.fontSize(18).text(filename, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);

      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        data.forEach((row, i) => {
          if (i > 0) doc.moveDown(0.3);
          const line = headers.map((h) => `${h}: ${row[h] ?? ''}`).join(' | ');
          doc.text(line);
        });
      } else {
        doc.text(JSON.stringify(data, null, 2));
      }

      doc.end();
    });
  }

  async exportToExcel(
    data: any,
    filename: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.columns = headers.map((h) => ({
        header: h,
        key: h,
        width: 20,
      }));
      data.forEach((row) => worksheet.addRow(row));
    } else {
      worksheet.addRow(['Data']);
      worksheet.addRow([JSON.stringify(data)]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Excel export generated: ${filename}.xlsx`);
    return { buffer: Buffer.from(buffer), filename: `${filename}.xlsx` };
  }

  async exportToCSV(
    data: any[],
    filename: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array for CSV export');
    }

    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';

    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        if (
          typeof value === 'string' &&
          (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      });
      csv += values.join(',') + '\n';
    });

    return { buffer: Buffer.from(csv, 'utf-8'), filename: `${filename}.csv` };
  }

  async export(
    data: any,
    format: ExportFormat,
    filename = 'report',
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    let result: { buffer: Buffer; filename: string };
    let mimeType: string;

    switch (format) {
      case ExportFormat.PDF:
        result = await this.exportToPDF(data, filename);
        mimeType = 'application/pdf';
        break;
      case ExportFormat.EXCEL:
        result = await this.exportToExcel(data, filename);
        mimeType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case ExportFormat.CSV:
        result = await this.exportToCSV(data, filename);
        mimeType = 'text/csv';
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    return { ...result, mimeType };
  }
}
