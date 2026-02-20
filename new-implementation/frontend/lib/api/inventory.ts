import { apiClient } from './client';
import type {
  StockLevel,
  StockMovement,
  Warehouse,
  WarehouseLocation,
  AdjustStockDto,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateLocationDto,
  StockQueryParams,
  MovementQueryParams,
  StockResponse,
  MovementsResponse,
  InventoryStats,
} from '@/types/inventory';

export const inventoryApi = {
  /**
   * Get current stock levels
   */
  getStock: async (params?: StockQueryParams): Promise<StockResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params?.warehouse_id) searchParams.append('warehouse_id', params.warehouse_id);
    if (params?.product_id) searchParams.append('product_id', params.product_id);
    if (params?.low_stock) searchParams.append('low_stock', params.low_stock.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await apiClient.get(`/inventory/stock?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get stock for a specific product
   */
  getStockByProduct: async (productId: string): Promise<StockLevel[]> => {
    const response = await apiClient.get(`/inventory/stock/${productId}`);
    return response.data;
  },

  /**
   * Adjust stock (IN, OUT, ADJUST, etc.)
   */
  adjustStock: async (data: AdjustStockDto): Promise<StockMovement> => {
    const response = await apiClient.post('/inventory/adjust', data);
    return response.data;
  },

  /**
   * Get stock movements
   */
  getMovements: async (params?: MovementQueryParams): Promise<MovementsResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params?.warehouse_id) searchParams.append('warehouse_id', params.warehouse_id);
    if (params?.product_id) searchParams.append('product_id', params.product_id);
    if (params?.movement_type) searchParams.append('movement_type', params.movement_type);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await apiClient.get(`/inventory/movements?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get a single movement by ID
   */
  getMovementById: async (id: string): Promise<StockMovement> => {
    const response = await apiClient.get(`/inventory/movements/${id}`);
    return response.data;
  },

  /**
   * Get all warehouses
   */
  getWarehouses: async (): Promise<Warehouse[]> => {
    const response = await apiClient.get('/inventory/warehouses');
    return response.data;
  },

  /**
   * Create a warehouse
   */
  createWarehouse: async (data: CreateWarehouseDto): Promise<Warehouse> => {
    const response = await apiClient.post('/inventory/warehouses', data);
    return response.data;
  },

  /**
   * Get warehouse by ID
   */
  getWarehouseById: async (id: string): Promise<Warehouse> => {
    const response = await apiClient.get(`/inventory/warehouses/${id}`);
    return response.data;
  },

  /**
   * Update warehouse
   */
  updateWarehouse: async (id: string, data: UpdateWarehouseDto): Promise<Warehouse> => {
    const response = await apiClient.put(`/inventory/warehouses/${id}`, data);
    return response.data;
  },

  /**
   * Get locations for a warehouse
   */
  getLocations: async (warehouseId: string): Promise<WarehouseLocation[]> => {
    const response = await apiClient.get(`/inventory/locations/${warehouseId}`);
    return response.data;
  },

  /**
   * Create a warehouse location
   */
  createLocation: async (data: CreateLocationDto): Promise<WarehouseLocation> => {
    const response = await apiClient.post('/inventory/locations', data);
    return response.data;
  },

  /**
   * Update warehouse location
   */
  updateLocation: async (
    id: string,
    data: Partial<CreateLocationDto>
  ): Promise<WarehouseLocation> => {
    const response = await apiClient.put(`/inventory/locations/${id}`, data);
    return response.data;
  },

  /**
   * Get inventory statistics
   */
  getStats: async (): Promise<InventoryStats> => {
    const response = await apiClient.get('/inventory/stats');
    return response.data;
  },
};
