import { Repository } from 'typeorm';
import { StockMovement } from '../../inventory/entities/stock-movement.entity';
import { Warehouse } from '../../inventory/entities/warehouse.entity';
import { Product } from '../../products/entities/product.entity';
export declare class InventoryReportService {
    private readonly stockMovementRepository;
    private readonly warehouseRepository;
    private readonly productRepository;
    private readonly logger;
    constructor(stockMovementRepository: Repository<StockMovement>, warehouseRepository: Repository<Warehouse>, productRepository: Repository<Product>);
    getInventoryValueByWarehouse(companyId: string): Promise<any[]>;
    getStockMovementSummary(companyId: string, startDate: Date, endDate: Date): Promise<any[]>;
    getLowStockProducts(companyId: string): Promise<any[]>;
}
