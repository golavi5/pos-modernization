export declare class CreateOrderItemDto {
    product_id: string;
    quantity: number;
    unit_price: number;
}
export declare class CreateOrderDto {
    customer_id?: string;
    items: CreateOrderItemDto[];
    notes?: string;
    discount_amount?: number;
}
