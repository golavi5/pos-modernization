export declare class ProductQueryDto {
    offset?: number;
    limit?: number;
    search?: string;
    category_id?: string;
    sort?: string;
    order?: 'ASC' | 'DESC';
    is_active?: boolean;
}
