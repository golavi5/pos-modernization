export interface Customer {
  id: string;
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyalty_points: number;
  total_purchases: number;
  last_purchase_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active?: boolean;
}

export interface CustomerQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  minLoyaltyPoints?: number;
  sortBy?: 'name' | 'total_purchases' | 'loyalty_points' | 'created_at';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CustomersResponse {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  totalLoyaltyPoints: number;
  avgPurchaseValue: number;
  recentCustomers: number;
}

export interface UpdateLoyaltyPointsDto {
  points: number;
  operation: 'add' | 'subtract' | 'set';
}

export interface PurchaseHistory {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}
