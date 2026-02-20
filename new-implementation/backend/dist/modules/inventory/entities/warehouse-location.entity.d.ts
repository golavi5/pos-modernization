import { Warehouse } from './warehouse.entity';
import { StockMovement } from './stock-movement.entity';
export declare class WarehouseLocation {
    id: string;
    company_id: string;
    warehouse_id: string;
    warehouse: Warehouse;
    location_code: string;
    capacity: number;
    current_stock: number;
    movements: StockMovement[];
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}
