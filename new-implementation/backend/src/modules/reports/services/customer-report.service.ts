import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Customer } from '../../customers/customer.entity';
import { Order } from '../../sales/entities/order.entity';
import { ReportQueryDto } from '../dto/report-query.dto';
import {
  CustomerReportDto,
  TopCustomerDto,
  CustomerSegmentDto,
} from '../dto/customer-report.dto';

@Injectable()
export class CustomerReportService {
  private readonly logger = new Logger(CustomerReportService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * Get top buying customers
   */
  async getTopCustomers(
    companyId: string,
    query: ReportQueryDto,
  ): Promise<TopCustomerDto[]> {
    const { startDate, endDate } = this.getDateRange(query);
    const limit = query.limit || 10;

    const results = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin(Customer, 'customer', 'customer.id = order.customer_id')
      .select('customer.id', 'customerId')
      .addSelect('customer.name', 'customerName')
      .addSelect('customer.email', 'email')
      .addSelect('customer.phone', 'phone')
      .addSelect('customer.loyalty_points', 'loyaltyPoints')
      .addSelect('COUNT(order.id)', 'totalPurchases')
      .addSelect('SUM(order.total_amount)', 'totalSpent')
      .addSelect('AVG(order.total_amount)', 'averageTicket')
      .addSelect('MAX(order.created_at)', 'lastPurchaseDate')
      .where('order.company_id = :companyId', { companyId })
      .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('order.customer_id IS NOT NULL')
      .groupBy('customer.id')
      .orderBy('totalSpent', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((row) => ({
      customerId: row.customerId,
      customerName: row.customerName,
      email: row.email,
      phone: row.phone,
      totalPurchases: parseInt(row.totalPurchases || '0'),
      totalSpent: parseFloat(row.totalSpent || '0'),
      averageTicket: parseFloat(row.averageTicket || '0'),
      lastPurchaseDate: row.lastPurchaseDate
        ? new Date(row.lastPurchaseDate)
        : null,
      loyaltyPoints: parseInt(row.loyaltyPoints || '0'),
    }));
  }

  /**
   * Get customer segmentation
   */
  async getCustomerSegments(
    companyId: string,
    query: ReportQueryDto,
  ): Promise<CustomerSegmentDto[]> {
    // Get all customers with their purchase data
    const customers = await this.customerRepository
      .createQueryBuilder('customer')
      .leftJoin(Order, 'order', 'order.customer_id = customer.id')
      .select('customer.id', 'customerId')
      .addSelect('customer.created_at', 'registrationDate')
      .addSelect('COUNT(order.id)', 'totalPurchases')
      .addSelect('SUM(order.total_amount)', 'totalSpent')
      .addSelect('MAX(order.created_at)', 'lastPurchaseDate')
      .where('customer.company_id = :companyId', { companyId })
      .groupBy('customer.id')
      .getRawMany();

    // Segment customers
    const segments = {
      vip: { customers: [] as any[], revenue: 0 },
      regular: { customers: [] as any[], revenue: 0 },
      new: { customers: [] as any[], revenue: 0 },
      inactive: { customers: [] as any[], revenue: 0 },
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    customers.forEach((customer) => {
      const totalPurchases = parseInt(customer.totalPurchases) || 0;
      const totalSpent = parseFloat(customer.totalSpent) || 0;
      const lastPurchase = customer.lastPurchaseDate
        ? new Date(customer.lastPurchaseDate)
        : null;
      const registrationDate = new Date(customer.registrationDate);

      // VIP: High spending (>$1000) or frequent purchases (>10)
      if (totalSpent >= 1000 || totalPurchases >= 10) {
        segments.vip.customers.push(customer);
        segments.vip.revenue += totalSpent;
      }
      // Inactive: No purchase in last 90 days
      else if (!lastPurchase || lastPurchase < ninetyDaysAgo) {
        segments.inactive.customers.push(customer);
        segments.inactive.revenue += totalSpent;
      }
      // New: Registered in last 30 days
      else if (registrationDate >= thirtyDaysAgo) {
        segments.new.customers.push(customer);
        segments.new.revenue += totalSpent;
      }
      // Regular: Everyone else
      else {
        segments.regular.customers.push(customer);
        segments.regular.revenue += totalSpent;
      }
    });

    const totalCustomers = customers.length;

    return [
      {
        segment: 'VIP',
        customerCount: segments.vip.customers.length,
        totalRevenue: segments.vip.revenue,
        averageSpent:
          segments.vip.customers.length > 0
            ? segments.vip.revenue / segments.vip.customers.length
            : 0,
        percentage:
          totalCustomers > 0
            ? (segments.vip.customers.length / totalCustomers) * 100
            : 0,
      },
      {
        segment: 'Regular',
        customerCount: segments.regular.customers.length,
        totalRevenue: segments.regular.revenue,
        averageSpent:
          segments.regular.customers.length > 0
            ? segments.regular.revenue / segments.regular.customers.length
            : 0,
        percentage:
          totalCustomers > 0
            ? (segments.regular.customers.length / totalCustomers) * 100
            : 0,
      },
      {
        segment: 'New',
        customerCount: segments.new.customers.length,
        totalRevenue: segments.new.revenue,
        averageSpent:
          segments.new.customers.length > 0
            ? segments.new.revenue / segments.new.customers.length
            : 0,
        percentage:
          totalCustomers > 0
            ? (segments.new.customers.length / totalCustomers) * 100
            : 0,
      },
      {
        segment: 'Inactive',
        customerCount: segments.inactive.customers.length,
        totalRevenue: segments.inactive.revenue,
        averageSpent:
          segments.inactive.customers.length > 0
            ? segments.inactive.revenue / segments.inactive.customers.length
            : 0,
        percentage:
          totalCustomers > 0
            ? (segments.inactive.customers.length / totalCustomers) * 100
            : 0,
      },
    ];
  }

  /**
   * Get comprehensive customer report
   */
  async getCustomerReport(
    companyId: string,
    query: ReportQueryDto,
  ): Promise<CustomerReportDto> {
    const { startDate, endDate } = this.getDateRange(query);

    const topBuyers = await this.getTopCustomers(companyId, query);
    const segments = await this.getCustomerSegments(companyId, query);

    // Count total customers
    const totalCustomers = await this.customerRepository.count({
      where: { company_id: companyId },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeCustomers = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customer_id)', 'count')
      .where('order.company_id = :companyId', { companyId })
      .andWhere('order.created_at >= :date', { date: thirtyDaysAgo })
      .andWhere('order.customer_id IS NOT NULL')
      .getRawOne();

    // Count new customers in period
    const newCustomers = await this.customerRepository.count({
      where: {
        company_id: companyId,
        created_at: Between(startDate, endDate),
      },
    });

    return {
      topBuyers,
      segments,
      totalCustomers,
      activeCustomers: parseInt(activeCustomers?.count) || 0,
      newCustomers,
      generatedAt: new Date(),
    };
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
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    return { startDate, endDate };
  }
}
