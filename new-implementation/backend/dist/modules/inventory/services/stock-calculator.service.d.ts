import { Repository } from 'typeorm';
import { WarehouseLocation } from '../entities/warehouse-location.entity';
import { StockMovement } from '../entities/stock-movement.entity';
export declare class StockCalculatorService {
    private locationRepository;
    private movementRepository;
    constructor(locationRepository: Repository<WarehouseLocation>, movementRepository: Repository<StockMovement>);
    calculateCurrentStock(productId: string, locationId: string): Promise<number>;
    getTotalStockByProduct(productId: string, companyId: string): Promise<number>;
}
