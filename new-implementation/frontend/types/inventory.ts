export interface StockLevel {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id?: string;
  location_name?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  last_movement_date?: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  product_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id?: string;
  location_name?: string;
  movement_type: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER' | 'DAMAGE' | 'RETURN';
  quantity: number;
  reference_number?: string;
  notes?: string;
  user_id: string;
  user_name?: string;
  created_at: string;
}

export interface Warehouse {
  id: string;
  company_id: string;
  name: string;
  code: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseLocation {
  id: string;
  warehouse_id: string;
  warehouse_name?: string;
  name: string;
  code: string;
  capacity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdjustStockDto {
  product_id: string;
  warehouse_id: string;
  location_id?: string;
  movement_type: 'IN' | 'OUT' | 'ADJUST' | 'DAMAGE' | 'RETURN';
  quantity: number;
  reference_number?: string;
  notes?: string;
}

export interface CreateWarehouseDto {
  name: string;
  code: string;
  address?: string;
}

export interface UpdateWarehouseDto {
  name?: string;
  code?: string;
  address?: string;
  is_active?: boolean;
}

export interface CreateLocationDto {
  warehouse_id: string;
  name: string;
  code: string;
  capacity?: number;
}

export interface StockQueryParams {
  page?: number;
  pageSize?: number;
  warehouse_id?: string;
  product_id?: string;
  low_stock?: boolean;
  sortBy?: 'product_name' | 'quantity' | 'last_movement_date';
  sortOrder?: 'ASC' | 'DESC';
}

export interface MovementQueryParams {
  page?: number;
  pageSize?: number;
  warehouse_id?: string;
  product_id?: string;
  movement_type?: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER' | 'DAMAGE' | 'RETURN';
  start_date?: string;
  end_date?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface StockResponse {
  data: StockLevel[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MovementsResponse {
  data: StockMovement[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InventoryStats {
  totalProducts: number;
  totalStock: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalWarehouses: number;
  recentMovements: number;
}
