export class CustomerStatsDto {
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_purchase_date?: Date;
  loyalty_points: number;
  purchase_frequency: string; // e.g., "Weekly", "Monthly"
}
