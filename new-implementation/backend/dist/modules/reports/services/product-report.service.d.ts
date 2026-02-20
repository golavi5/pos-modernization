import { Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { OrderItem } from '../../sales/entities/order-item.entity';
import { Order } from '../../sales/entities/order.entity';
import { StockMovement } from '../../inventory/entities/stock-movement.entity';
import { ReportQueryDto } from '../dto/report-query.dto';
import { TopSellingProductDto, LowStockProductDto, ProductReportDto, InventoryReportDto } from '../dto/product-report.dto';
export declare class ProductReportService {
    private readonly productRepository;
    private readonly orderItemRepository;
    private readonly orderRepository;
    private readonly stockMovementRepository;
    private readonly logger;
    constructor(productRepository: Repository<Product>, orderItemRepository: Repository<OrderItem>, orderRepository: Repository<Order>, stockMovementRepository: Repository<StockMovement>);
    getTopSellingProducts(companyId: string, query: ReportQueryDto): Promise<TopSellingProductDto[]>;
    getLowStockProducts(companyId: string, query: ReportQueryDto): Promise<LowStockProductDto[]>;
    getInventoryTurnover(companyId: string, query: ReportQueryDto): Promise<InventoryReportDto>;
    getProductReport(companyId: string, query: ReportQueryDto): Promise<ProductReportDto>;
    private calculateTotalSold;
    private getDateRange;
}
