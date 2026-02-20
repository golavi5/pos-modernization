import { MovementType } from '../entities/stock-movement.entity';
export declare class AdjustStockDto {
    product_id: string;
    location_id: string;
    movement_type: MovementType;
    quantity: number;
    reference_id?: string;
    notes?: string;
}
