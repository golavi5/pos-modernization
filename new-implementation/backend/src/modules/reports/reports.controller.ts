import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SalesReportService } from './services/sales-report.service';
import { ProductReportService } from './services/product-report.service';
import { CustomerReportService } from './services/customer-report.service';
import { ExportService } from './services/export.service';
import { InventoryReportService } from './services/inventory-report.service';
import { ReportQueryDto, ExportQueryDto } from './dto/report-query.dto';
import {
  SalesReportDto,
  SalesSummaryDto,
  RevenueTrendsDto,
} from './dto/sales-report.dto';
import {
  ProductReportDto,
  InventoryReportDto,
} from './dto/product-report.dto';
import { CustomerReportDto } from './dto/customer-report.dto';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly salesReportService: SalesReportService,
    private readonly productReportService: ProductReportService,
    private readonly customerReportService: CustomerReportService,
    private readonly inventoryReportService: InventoryReportService,
    private readonly exportService: ExportService,
  ) {}

  // ==================== SALES REPORTS ====================

  @Get('sales/summary')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get sales summary report' })
  @ApiResponse({ status: 200, type: SalesSummaryDto })
  async getSalesSummary(
    @CurrentUser() user: any,
    @Query() query: ReportQueryDto,
  ): Promise<SalesSummaryDto> {
    return this.salesReportService.getSalesSummary(user.companyId, query);
  }

  @Get('sales/by-period')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get detailed sales report by period' })
  @ApiResponse({ status: 200, type: SalesReportDto })
  async getSalesByPeriod(
    @CurrentUser() user: any,
    @Query() query: ReportQueryDto,
  ): Promise<SalesReportDto> {
    return this.salesReportService.getSalesByPeriod(user.companyId, query);
  }

  @Get('revenue/trends')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get revenue trends and payment method breakdown' })
  @ApiResponse({ status: 200, type: RevenueTrendsDto })
  async getRevenueTrends(
    @CurrentUser() user: any,
    @Query() query: ReportQueryDto,
  ): Promise<RevenueTrendsDto> {
    return this.salesReportService.getRevenueTrends(user.companyId, query);
  }

  // ==================== PRODUCT REPORTS ====================

  @Get('products/top-selling')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, type: [Object] })
  async getTopSellingProducts(
    @CurrentUser() user: any,
    @Query() query: ReportQueryDto,
  ) {
    return this.productReportService.getTopSellingProducts(
      user.companyId,
      query,
    );
  }

  @Get('products/low-stock')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'Get products with low stock levels' })
  @ApiResponse({ status: 200, type: [Object] })
  async getLowStockProducts(
    @CurrentUser() user: any,
    @Query() query: ReportQueryDto,
  ) {
    return this.productReportService.getLowStockProducts(user.companyId, query);
  }

  @Get('products/report')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get comprehensive product report' })
  @ApiResponse({ status: 200, type: ProductReportDto })
  async getProductReport(
    @CurrentUser() user: any,
    @Query() query: ReportQueryDto,
  ): Promise<ProductReportDto> {
    return this.productReportService.getProductReport(user.companyId, query);
  }

  // ==================== INVENTORY REPORTS ====================

  @Get('inventory/turnover')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get inventory turnover analysis' })
  @ApiResponse({ status: 200, type: InventoryReportDto })
  async getInventoryTurnover(
    @CurrentUser() user: any,
    @Query() query: ReportQueryDto,
  ): Promise<InventoryReportDto> {
    return this.productReportService.getInventoryTurnover(
      user.companyId,
      query,
    );
  }

  @Get('inventory/value-by-warehouse')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get inventory value grouped by warehouse' })
  @ApiResponse({ status: 200, type: [Object] })
  async getInventoryValueByWarehouse(@CurrentUser() user: any) {
    return this.inventoryReportService.getInventoryValueByWarehouse(
      user.companyId,
    );
  }

  // ==================== CUSTOMER REPORTS ====================

  @Get('customers/top-buyers')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get top buying customers' })
  @ApiResponse({ status: 200, type: [Object] })
  async getTopCustomers(
    @CurrentUser() user: any,
    @Query() query: ReportQueryDto,
  ) {
    return this.customerReportService.getTopCustomers(user.companyId, query);
  }

  @Get('customers/segments')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get customer segmentation analysis' })
  @ApiResponse({ status: 200, type: [Object] })
  async getCustomerSegments(
    @CurrentUser() user: any,
    @Query() query: ReportQueryDto,
  ) {
    return this.customerReportService.getCustomerSegments(user.companyId, query);
  }

  @Get('customers/report')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get comprehensive customer report' })
  @ApiResponse({ status: 200, type: CustomerReportDto })
  async getCustomerReport(
    @CurrentUser() user: any,
    @Query() query: ReportQueryDto,
  ): Promise<CustomerReportDto> {
    return this.customerReportService.getCustomerReport(user.companyId, query);
  }

  // ==================== EXPORT ENDPOINTS ====================

  @Get('export/sales')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Export sales report to PDF/Excel/CSV' })
  async exportSalesReport(
    @CurrentUser() user: any,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const data = await this.salesReportService.getSalesByPeriod(
      user.companyId,
      query,
    );

    try {
      const { buffer, filename, mimeType } = await this.exportService.export(
        data,
        query.format,
        query.filename || 'sales-report',
      );

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(buffer);
    } catch (error) {
      res.status(HttpStatus.NOT_IMPLEMENTED).json({
        statusCode: HttpStatus.NOT_IMPLEMENTED,
        message: error.message,
        error: 'Not Implemented',
      });
    }
  }

  @Get('export/products')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Export product report to PDF/Excel/CSV' })
  async exportProductReport(
    @CurrentUser() user: any,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const data = await this.productReportService.getProductReport(
      user.companyId,
      query,
    );

    try {
      const { buffer, filename, mimeType } = await this.exportService.export(
        data,
        query.format,
        query.filename || 'product-report',
      );

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(buffer);
    } catch (error) {
      res.status(HttpStatus.NOT_IMPLEMENTED).json({
        statusCode: HttpStatus.NOT_IMPLEMENTED,
        message: error.message,
        error: 'Not Implemented',
      });
    }
  }

  @Get('export/customers')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Export customer report to PDF/Excel/CSV' })
  async exportCustomerReport(
    @CurrentUser() user: any,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const data = await this.customerReportService.getCustomerReport(
      user.companyId,
      query,
    );

    try {
      const { buffer, filename, mimeType } = await this.exportService.export(
        data,
        query.format,
        query.filename || 'customer-report',
      );

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(buffer);
    } catch (error) {
      res.status(HttpStatus.NOT_IMPLEMENTED).json({
        statusCode: HttpStatus.NOT_IMPLEMENTED,
        message: error.message,
        error: 'Not Implemented',
      });
    }
  }
}
