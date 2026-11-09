import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order, OrderStatus } from '../../sales/entities/order.entity';
import { PaymentStatus } from '../../sales/entities/payment.entity';
import { SettingsService } from '../../settings/services/settings.service';
import { mysqlOffset } from '../../../common/timezone';
import { OrderItem } from '../../sales/entities/order-item.entity';
import { ReportQueryDto, PeriodType } from '../dto/report-query.dto';
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
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Generate sales summary report
   */
  async getSalesSummary(
    companyId: string,
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
    companyId: string,
    query: ReportQueryDto,
  ): Promise<SalesReportDto> {
    const { startDate, endDate } = this.getDateRange(query);
    const { timezone } = await this.settingsService.getSettings(companyId);

    const summary = await this.getSalesSummary(companyId, query);

    // Get period data grouped by day/week/month (in the company's timezone)
    const periodData = await this.getSalesGroupedByPeriod(
      companyId,
      startDate,
      endDate,
      query.period,
      timezone,
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
    companyId: string,
    query: ReportQueryDto,
  ): Promise<RevenueTrendsDto> {
    const { startDate, endDate } = this.getDateRange(query);
    const { timezone } = await this.settingsService.getSettings(companyId);

    // Get trends over time (in the company's timezone)
    const trends = await this.getSalesGroupedByPeriod(
      companyId,
      startDate,
      endDate,
      query.period,
      timezone,
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
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Omit<SalesSummaryDto, 'period' | 'comparedToLastPeriod'>> {
    const orders = await this.orderRepository.find({
      where: {
        company_id: companyId,
        // A sale is a completed order: drafts, pending, cancelled and voided
        // orders are not revenue.
        status: OrderStatus.COMPLETED,
        created_at: Between(startDate, endDate),
      },
      relations: ['order_items', 'order_items.product'],
    });

    const totalSales = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.total_amount),
      0,
    );
    const totalItems = orders.reduce(
      (sum, order) =>
        sum + order.order_items.reduce((s, item) => s + item.quantity, 0),
      0,
    );

    // Calculate profit (assuming cost is tracked in product)
    const totalProfit = orders.reduce((sum, order) => {
      const saleProfit = order.order_items.reduce((itemSum, item) => {
        const profit =
          (Number(item.unit_price) - (item.product?.cost || 0)) * item.quantity;
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
    companyId: string,
    startDate: Date,
    endDate: Date,
    periodType: PeriodType,
    timeZone: string,
  ): Promise<SalesByPeriodDto[]> {
    let dateFormat: string;

    switch (periodType) {
      case PeriodType.DAILY:
        dateFormat = '%Y-%m-%d';
        break;
      case PeriodType.WEEKLY:
        dateFormat = '%x-W%v';
        break;
      case PeriodType.MONTHLY:
        dateFormat = '%Y-%m';
        break;
      case PeriodType.YEARLY:
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    // Group by the very expression that is selected: MySQL 8's default
    // `only_full_group_by` rejects selecting DATE_FORMAT(created_at) while
    // grouping by DATE(created_at)/YEARWEEK(created_at), and the endpoint 500'd.
    // `created_at` is UTC; shift it to the company's zone before bucketing
    // (SPEC-BACK-008). The offset is fixed per query (the one at the end of the
    // range): exact without daylight saving, ≤1 h off at a DST boundary.
    const offset = mysqlOffset(timeZone, endDate);
    const bucket = `DATE_FORMAT(CONVERT_TZ(order.created_at, '+00:00', '${offset}'), '${dateFormat}')`;

    const results = await this.orderRepository
      .createQueryBuilder('order')
      .select(bucket, 'date')
      .addSelect('COUNT(*)', 'totalSales')
      .addSelect('SUM(order.total_amount)', 'totalRevenue')
      .addSelect('AVG(order.total_amount)', 'averageTicket')
      .where('order.company_id = :companyId', { companyId })
      .andWhere('order.status = :completed', { completed: OrderStatus.COMPLETED })
      .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy(bucket)
      .orderBy('date', 'ASC')
      .getRawMany();

    return results.map((row) => ({
      date: row.date,
      totalSales: parseInt(row.totalSales),
      totalRevenue: parseFloat(row.totalRevenue || '0'),
      totalItems: 0,
      averageTicket: parseFloat(row.averageTicket || '0'),
    }));
  }

  /**
   * Get revenue breakdown by payment method
   */
  private async getRevenueByPaymentMethod(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<RevenueByPaymentMethodDto[]> {
    const results = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.payments', 'payment')
      .select('payment.payment_method', 'paymentMethod')
      .addSelect('SUM(payment.amount)', 'totalRevenue')
      .addSelect('COUNT(DISTINCT order.id)', 'transactionCount')
      .where('order.company_id = :companyId', { companyId })
      // Refunded and failed payments are not revenue.
      .andWhere('payment.status = :paid', { paid: PaymentStatus.COMPLETED })
      .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('payment.payment_method')
      .getRawMany();

    const totalRevenue = results.reduce(
      (sum, row) => sum + parseFloat(row.totalRevenue || '0'),
      0,
    );

    return results.map((row) => ({
      paymentMethod: row.paymentMethod,
      totalRevenue: parseFloat(row.totalRevenue || '0'),
      transactionCount: parseInt(row.transactionCount),
      percentage:
        totalRevenue > 0
          ? (parseFloat(row.totalRevenue || '0') / totalRevenue) * 100
          : 0,
    }));
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(oldValue: number, newValue: number): number {
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
