export interface SaleItem {
  id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax_rate?: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  company_id: string;
  order_number: string;
  customer_id?: string;
  customer_name?: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';
  status: 'draft' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  items: SaleItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateSaleDto {
  customer_id?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    tax_rate?: number;
  }[];
  payment_method: string;
  payment_status?: 'pending' | 'paid' | 'partial';
  discount_amount?: number;
  notes?: string;
}

export interface UpdateSaleDto {
  customer_id?: string;
  payment_method?: string;
  payment_status?: 'pending' | 'paid' | 'partial' | 'refunded';
  status?: 'draft' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
}

export interface SaleQueryParams {
  page?: number;
  pageSize?: number;
  status?: 'draft' | 'completed' | 'cancelled' | 'refunded';
  payment_status?: 'pending' | 'paid' | 'partial' | 'refunded';
  customer_id?: string;
  start_date?: string;
  end_date?: string;
  sortBy?: 'created_at' | 'total_amount' | 'order_number';
  sortOrder?: 'ASC' | 'DESC';
}

export interface SalesResponse {
  data: Sale[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  todaySales: number;
  todayRevenue: number;
  pendingPayments: number;
}

export interface CartItem extends SaleItem {
  product_id: string;
  product_name: string;
  stock_quantity: number;
  image_url?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customer_id?: string;
  customer_name?: string;
}
