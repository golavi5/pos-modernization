import { StockService } from './services/stock.service';
import { WarehouseService } from './services/warehouse.service';
import { MovementService } from './services/movement.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { MovementQueryDto } from './dto/movement-query.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { User } from '../auth/entities/user.entity';
interface CurrentUserWithCompany extends User {
    company_id: string;
}
export declare class InventoryController {
    private readonly stockService;
    private readonly warehouseService;
    private readonly movementService;
    constructor(stockService: StockService, warehouseService: WarehouseService, movementService: MovementService);
    getStock(user: CurrentUserWithCompany): Promise<any>;
    getStockByProduct(productId: string, user: CurrentUserWithCompany): Promise<any>;
    adjustStock(dto: AdjustStockDto, user: CurrentUserWithCompany): Promise<import("./entities/stock-movement.entity").StockMovement>;
    listMovements(query: MovementQueryDto, user: CurrentUserWithCompany): Promise<{
        movements: import("./entities/stock-movement.entity").StockMovement[];
        total: number;
    }>;
    getMovement(id: string, user: CurrentUserWithCompany): Promise<import("./entities/stock-movement.entity").StockMovement>;
    listWarehouses(user: CurrentUserWithCompany): Promise<import("./entities/warehouse.entity").Warehouse[]>;
    createWarehouse(dto: CreateWarehouseDto, user: CurrentUserWithCompany): Promise<import("./entities/warehouse.entity").Warehouse>;
    getWarehouse(id: string, user: CurrentUserWithCompany): Promise<import("./entities/warehouse.entity").Warehouse>;
    updateWarehouse(id: string, dto: Partial<CreateWarehouseDto>, user: CurrentUserWithCompany): Promise<import("./entities/warehouse.entity").Warehouse>;
    createLocation(dto: CreateLocationDto, user: CurrentUserWithCompany): Promise<import("./entities/warehouse-location.entity").WarehouseLocation>;
    updateLocation(id: string, dto: Partial<CreateLocationDto>, user: CurrentUserWithCompany): Promise<import("./entities/warehouse-location.entity").WarehouseLocation>;
    listLocations(warehouseId: string, user: CurrentUserWithCompany): Promise<import("./entities/warehouse-location.entity").WarehouseLocation[]>;
}
export {};
