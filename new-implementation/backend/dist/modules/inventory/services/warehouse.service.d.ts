import { Repository } from 'typeorm';
import { Warehouse } from '../entities/warehouse.entity';
import { WarehouseLocation } from '../entities/warehouse-location.entity';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { CreateLocationDto } from '../dto/create-location.dto';
import { User } from '../../auth/entities/user.entity';
interface CurrentUser extends User {
    company_id: string;
}
export declare class WarehouseService {
    private warehouseRepository;
    private locationRepository;
    constructor(warehouseRepository: Repository<Warehouse>, locationRepository: Repository<WarehouseLocation>);
    listWarehouses(user: CurrentUser): Promise<Warehouse[]>;
    getWarehouseById(id: string, user: CurrentUser): Promise<Warehouse>;
    createWarehouse(dto: CreateWarehouseDto, user: CurrentUser): Promise<Warehouse>;
    updateWarehouse(id: string, dto: Partial<CreateWarehouseDto>, user: CurrentUser): Promise<Warehouse>;
    createLocation(dto: CreateLocationDto, user: CurrentUser): Promise<WarehouseLocation>;
    updateLocation(id: string, dto: Partial<CreateLocationDto>, user: CurrentUser): Promise<WarehouseLocation>;
    listLocations(warehouseId: string, user: CurrentUser): Promise<WarehouseLocation[]>;
}
export {};
