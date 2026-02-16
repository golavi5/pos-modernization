import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale } from '../../sales/entities/sale.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';
import {
  ReportQueryDto,
  PeriodType,
} from '../dto/report-query.dto';
import {
  SalesReportDto,
  SalesSummaryDto,
  SalesByPeriodDto,
  RevenueTrendsDto,
  RevenueByPaymentMethodDto,
} from '../dto/sales-report.dto';

@Injectable()
export class SalesReportService {
  private readonly logger = new Logger(SalesReportService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepository: Repository<SaleItem>,
  ) {}

  /**
   * Generate sales summary report
   */
  async getSalesSummary(
    companyId: number,
    query: ReportQueryDto,
  ): Promise<SalesSummaryDto> {
    const { startDate, endDate } = this.getDateRange(query);

    // Get current period data
    const currentPeriod = await this.calculatePeriodMetrics(
      companyId,
      startDate,
      endDate,
    );

    // Get previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(startDate.getTime() - periodLength);

    const previousPeriod = await this.calculatePeriodMetrics(
      companyId,
      prevStartDate,
      prevEndDate,
    );

    // Calculate changes
    const salesChange = this.calculatePercentageChange(
      previousPeriod.totalSales,
      currentPeriod.totalSales,
    );
    const revenueChange = this.calculatePercentageChange(
      previousPeriod.totalRevenue,
      currentPeriod.totalRevenue,
    );
    const profitChange = this.calculatePercentageChange(
      previousPeriod.totalProfit,
      currentPeriod.totalProfit,
    );

    return {
      ...currentPeriod,
      period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
      comparedToLastPeriod: {
        salesChange,
        revenueChange,
        profitChange,
      },
    };
  }

  /**
   * Generate detailed sales report by period
   */
  async getSalesByPeriod(
    companyId: number,
    query: ReportQueryDto,
  ): Promise<SalesReportDto> {
    const { startDate, endDate } = this.getDateRange(query);

    const summary = await this.getSalesSummary(companyId, query);

    // Get period data grouped by day/week/month
    const periodData = await this.getSalesGroupedByPeriod(
      companyId,
      startDate,
      endDate,
      query.period,
    );

    return {
      summary,
      periodData,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate revenue trends report
   */
  async getRevenueTrends(
    companyId: number,
    query: ReportQueryDto,
  ): Promise<RevenueTrendsDto> {
    const { startDate, endDate } = this.getDateRange(query);

    // Get trends over time
    const trends = await this.getSalesGroupedByPeriod(
      companyId,
      startDate,
      endDate,
      query.period,
    );

    // Get revenue by payment method
    const byPaymentMethod = await this.getRevenueByPaymentMethod(
      companyId,
      startDate,
      endDate,
    );

    const totalRevenue = byPaymentMethod.reduce(
      (sum, method) => sum + method.totalRevenue,
      0,
    );

    return {
      trends,
      byPaymentMethod,
      totalRevenue,
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate metrics for a specific period
   */
  private async calculatePeriodMetrics(
    companyId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Omit<SalesSummaryDto, 'period' | 'comparedToLastPeriod'>> {
    const sales = await this.saleRepository.find({
      where: {
        companyId,
        createdAt: Between(startDate, endDate),
      },
      relations: ['items'],
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalItems = sales.reduce(
      (sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0),
      0,
    );

    // Calculate profit (assuming cost is tracked in product)
    const totalProfit = sales.reduce((sum, sale) => {
      const saleProfit = sale.items.reduce((itemSum, item) => {
        const profit = (item.unitPrice - (item.product?.cost || 0)) * item.quantity;
        return itemSum + profit;
      }, 0);
      return sum + saleProfit;
    }, 0);

    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      totalSales,
      totalRevenue,
      totalProfit,
      averageTicket,
      totalItems,
    };
  }

  /**
   * Get sales grouped by period (day/week/month)
   */
  private async getSalesGroupedByPeriod(
    companyId: number,
    startDate: Date,
    endDate: Date,
    periodType: PeriodType,
  ): Promise<SalesByPeriodDto[]> {
    let dateFormat: string;
    let groupBy: string;

    switch (periodType) {
      case PeriodType.DAILY:
        dateFormat = '%Y-%m-%d';
        groupBy = 'DATE(sale.createdAt)';
        break;
      case PeriodType.WEEKLY:
        dateFormat = '%Y-W%u';
        groupBy = 'YEARWEEK(sale.createdAt)';
        break;
      case PeriodType.MONTHLY:
        dateFormat = '%Y-%m';
        groupBy = 'DATE_FORMAT(sale.createdAt, "%Y-%m")';
        break;
      case PeriodType.YEARLY:
        dateFormat = '%Y';
        groupBy = 'YEAR(sale.createdAt)';
        break;
      default:
        dateFormat = '%Y-%m-%d';
        groupBy = 'DATE(sale.createdAt)';
    }

    const results = await this.saleRepository
      .createQueryBuilder('sale')
      .select(`DATE_FORMAT(sale.createdAt, '${dateFormat}')`, 'date')
      .addSelect('COUNT(*)', 'totalSales')
      .addSelect('SUM(sale.totalAmount)', 'totalRevenue')
      .addSelect('SUM(sale.totalItems)', 'totalItems')
      .addSelect('AVG(sale.totalAmount)', 'averageTicket')
      .where('sale.companyId = :companyId', { companyId })
      .andWhere('sale.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy(groupBy)
      .orderBy('date', 'ASC')
      .getRawMany();

    return results.map((row) => ({
      date: row.date,
      totalSales: parseInt(row.totalSales),
      totalRevenue: parseFloat(row.totalRevenue),
      totalItems: parseInt(row.totalItems),
      averageTicket: parseFloat(row.averageTicket),
    }));
  }

  /**
   * Get revenue breakdown by payment method
   */
  private async getRevenueByPaymentMethod(
    companyId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<RevenueByPaymentMethodDto[]> {
    const results = await this.saleRepository
      .createQueryBuilder('sale')
      .select('sale.paymentMethod', 'paymentMethod')
      .addSelect('SUM(sale.totalAmount)', 'totalRevenue')
      .addSelect('COUNT(*)', 'transactionCount')
      .where('sale.companyId = :companyId', { companyId })
      .andWhere('sale.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('sale.paymentMethod')
      .getRawMany();

    const totalRevenue = results.reduce(
      (sum, row) => sum + parseFloat(row.totalRevenue),
      0,
    );

    return results.map((row) => ({
      paymentMethod: row.paymentMethod,
      totalRevenue: parseFloat(row.totalRevenue),
      transactionCount: parseInt(row.transactionCount),
      percentage:
        totalRevenue > 0
          ? (parseFloat(row.totalRevenue) / totalRevenue) * 100
          : 0,
    }));
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(
    oldValue: number,
    newValue: number,
  ): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Get date range based on query parameters
   */
  private getDateRange(query: ReportQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    if (query.startDate && query.endDate) {
      return {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      };
    }

    const endDate = new Date();
    let startDate: Date;

    switch (query.period) {
      case PeriodType.DAILY:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case PeriodType.WEEKLY:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case PeriodType.MONTHLY:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case PeriodType.YEARLY:
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    return { startDate, endDate };
  }
}
