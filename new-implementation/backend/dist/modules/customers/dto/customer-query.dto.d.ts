export declare class CustomerQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    sort_by?: 'name' | 'total_purchases' | 'last_purchase_date' | 'created_at' | 'loyalty_points';
    order?: 'ASC' | 'DESC';
    isActive?: boolean;
    minLoyaltyPoints?: number;
}
