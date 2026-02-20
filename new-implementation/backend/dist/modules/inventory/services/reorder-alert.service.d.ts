import { Repository } from 'typeorm';
import { StockCalculatorService } from './stock-calculator.service';
import { WarehouseLocation } from '../entities/warehouse-location.entity';
export declare class ReorderAlertService {
    private locationRepository;
    private stockCalculator;
    private readonly logger;
    constructor(locationRepository: Repository<WarehouseLocation>, stockCalculator: StockCalculatorService);
    checkReorderLevels(companyId: string, reorderThreshold?: number): Promise<Array<{
        product_id: string;
        location_id: string;
        stock: number;
    }>>;
}
