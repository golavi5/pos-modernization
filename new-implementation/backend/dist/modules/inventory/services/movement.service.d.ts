import { Repository } from 'typeorm';
import { StockMovement, MovementType } from '../entities/stock-movement.entity';
import { MovementQueryDto } from '../dto/movement-query.dto';
import { WarehouseLocation } from '../entities/warehouse-location.entity';
import { User } from '../../auth/entities/user.entity';
interface CurrentUser extends User {
    company_id: string;
}
export declare class MovementService {
    private movementRepository;
    private locationRepository;
    constructor(movementRepository: Repository<StockMovement>, locationRepository: Repository<WarehouseLocation>);
    listMovements(query: MovementQueryDto, user: CurrentUser): Promise<{
        movements: StockMovement[];
        total: number;
    }>;
    getMovementById(id: string, user: CurrentUser): Promise<StockMovement>;
    recordMovement(productId: string, locationId: string, movementType: MovementType, quantity: number, user: CurrentUser, referenceId?: string, notes?: string): Promise<StockMovement>;
}
export {};
