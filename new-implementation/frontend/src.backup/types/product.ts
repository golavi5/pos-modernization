export interface Product {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category?: string;
  price: number;
  cost?: number;
  stock_quantity: number;
  min_stock_level?: number;
  max_stock_level?: number;
  unit_of_measure?: string;
  tax_rate?: number;
  is_active: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category?: string;
  price: number;
  cost?: number;
  stock_quantity: number;
  min_stock_level?: number;
  max_stock_level?: number;
  unit_of_measure?: string;
  tax_rate?: number;
  image_url?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  price?: number;
  cost?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  unit_of_measure?: string;
  tax_rate?: number;
  is_active?: boolean;
  image_url?: string;
}

export interface ProductQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'price' | 'stock_quantity' | 'created_at';
  sortOrder?: 'ASC' | 'DESC';
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  categories: string[];
}
