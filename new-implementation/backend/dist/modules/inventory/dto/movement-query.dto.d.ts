import { MovementType } from '../entities/stock-movement.entity';
export declare class MovementQueryDto {
    page?: number;
    limit?: number;
    product_id?: string;
    location_id?: string;
    movement_type?: MovementType;
    start_date?: string;
    end_date?: string;
}
