import { Repository } from 'typeorm';
import { WarehouseLocation } from '../entities/warehouse-location.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { StockCalculatorService } from './stock-calculator.service';
import { User } from '../../auth/entities/user.entity';
interface CurrentUser extends User {
    company_id: string;
}
export declare class StockService {
    private locationRepository;
    private movementRepository;
    private stockCalculator;
    private readonly logger;
    constructor(locationRepository: Repository<WarehouseLocation>, movementRepository: Repository<StockMovement>, stockCalculator: StockCalculatorService);
    getCurrentStock(user: CurrentUser): Promise<any>;
    getStockByProduct(productId: string, user: CurrentUser): Promise<any>;
    adjustStock(dto: AdjustStockDto, user: CurrentUser): Promise<StockMovement>;
    deductStockOnOrder(productId: string, quantity: number, user: CurrentUser, orderId: string): Promise<void>;
}
export {};
