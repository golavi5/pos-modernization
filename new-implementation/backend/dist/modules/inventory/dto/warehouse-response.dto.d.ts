export declare class WarehouseResponseDto {
    id: string;
    company_id: string;
    name: string;
    address?: string;
    manager_id?: string;
    is_active: boolean;
    locations?: Array<{
        id: string;
        location_code: string;
        capacity: number;
        current_stock: number;
    }>;
    created_at: Date;
    updated_at: Date;
}
