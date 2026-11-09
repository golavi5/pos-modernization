export type MovementType = 'IN' | 'OUT' | 'ADJUST' | 'DAMAGE' | 'RETURN';

/** One row per product (GET /inventory/stock). */
export interface StockLevel {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  reorder_level: number;
}

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  product_name?: string;
  location_id: string;
  movement_type: MovementType;
  quantity: number;
  reference_id?: string;
  notes?: string;
  created_by: string;
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
  movement_type: MovementType;
  /** Positive integer */
  quantity: number;
  reference_id?: string;
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
  search?: string;
  low_stock?: boolean;
}

export interface MovementQueryParams {
  page?: number;
  pageSize?: number;
  product_id?: string;
  movement_type?: MovementType;
  start_date?: string;
  end_date?: string;
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
