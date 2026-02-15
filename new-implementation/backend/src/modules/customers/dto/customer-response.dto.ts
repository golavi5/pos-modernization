export class CustomerResponseDto {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  loyalty_points: number;
  total_purchases: number;
  last_purchase_date?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
