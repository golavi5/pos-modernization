import { Repository } from 'typeorm';
import { Order } from '../../sales/entities/order.entity';
import { OrderItem } from '../../sales/entities/order-item.entity';
import { ReportQueryDto } from '../dto/report-query.dto';
import { SalesReportDto, SalesSummaryDto, RevenueTrendsDto } from '../dto/sales-report.dto';
export declare class SalesReportService {
    private readonly orderRepository;
    private readonly orderItemRepository;
    private readonly logger;
    constructor(orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>);
    getSalesSummary(companyId: string, query: ReportQueryDto): Promise<SalesSummaryDto>;
    getSalesByPeriod(companyId: string, query: ReportQueryDto): Promise<SalesReportDto>;
    getRevenueTrends(companyId: string, query: ReportQueryDto): Promise<RevenueTrendsDto>;
    private calculatePeriodMetrics;
    private getSalesGroupedByPeriod;
    private getRevenueByPaymentMethod;
    private calculatePercentageChange;
    private getDateRange;
}
