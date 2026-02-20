import { OrderItem } from '../../sales/entities/order-item.entity';
export declare class Product {
    id: string;
    company_id: string;
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
    is_active: boolean;
    image_url?: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
    order_items: OrderItem[];
}
