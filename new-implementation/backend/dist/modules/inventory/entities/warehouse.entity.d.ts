import { WarehouseLocation } from './warehouse-location.entity';
export declare class Warehouse {
    id: string;
    company_id: string;
    name: string;
    address: string;
    manager_id: string;
    is_active: boolean;
    locations: WarehouseLocation[];
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}
