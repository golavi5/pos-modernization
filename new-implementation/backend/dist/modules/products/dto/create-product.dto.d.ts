export declare class CreateProductDto {
    name: string;
    description?: string;
    sku: string;
    barcode?: string;
    category_id?: string;
    price: number;
    cost?: number;
    stock_quantity: number;
    reorder_level: number;
    tax_rate: number;
    is_active?: boolean;
    image_url?: string;
    company_id: string;
    created_by: string;
}
