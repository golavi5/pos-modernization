import { WarehouseLocation } from './warehouse-location.entity';
export declare enum MovementType {
    IN = "IN",
    OUT = "OUT",
    ADJUST = "ADJUST",
    DAMAGE = "DAMAGE",
    RETURN = "RETURN"
}
export declare class StockMovement {
    id: string;
    company_id: string;
    product_id: string;
    location_id: string;
    location: WarehouseLocation;
    movement_type: MovementType;
    quantity: number;
    reference_id: string;
    notes: string;
    created_by: string;
    created_at: Date;
}
