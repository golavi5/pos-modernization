export declare class SalesSummaryDto {
    total_orders: number;
    total_revenue: number;
    total_discount: number;
    average_order_value: number;
    top_products?: Array<{
        product_id: number;
        product_name: string;
        quantity_sold: number;
        revenue: number;
    }>;
    date_range: {
        start_date: Date;
        end_date: Date;
    };
}
