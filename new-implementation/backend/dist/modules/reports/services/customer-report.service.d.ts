import { Repository } from 'typeorm';
import { Customer } from '../../customers/customer.entity';
import { Order } from '../../sales/entities/order.entity';
import { ReportQueryDto } from '../dto/report-query.dto';
import { CustomerReportDto, TopCustomerDto, CustomerSegmentDto } from '../dto/customer-report.dto';
export declare class CustomerReportService {
    private readonly customerRepository;
    private readonly orderRepository;
    private readonly logger;
    constructor(customerRepository: Repository<Customer>, orderRepository: Repository<Order>);
    getTopCustomers(companyId: string, query: ReportQueryDto): Promise<TopCustomerDto[]>;
    getCustomerSegments(companyId: string, query: ReportQueryDto): Promise<CustomerSegmentDto[]>;
    getCustomerReport(companyId: string, query: ReportQueryDto): Promise<CustomerReportDto>;
    private getDateRange;
}
