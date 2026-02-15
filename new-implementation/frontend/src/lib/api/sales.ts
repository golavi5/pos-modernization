import { apiClient } from './client';
import type {
  Sale,
  CreateSaleDto,
  UpdateSaleDto,
  SaleQueryParams,
  SalesResponse,
  SalesStats,
} from '@/types/sale';

export const salesApi = {
  /**
   * Get all sales with pagination and filters
   */
  getAll: async (params?: SaleQueryParams): Promise<SalesResponse> => {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.payment_status) searchParams.append('payment_status', params.payment_status);
    if (params?.customer_id) searchParams.append('customer_id', params.customer_id);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await apiClient.get(`/sales?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get a single sale by ID
   */
  getById: async (id: string): Promise<Sale> => {
    const response = await apiClient.get(`/sales/${id}`);
    return response.data;
  },

  /**
   * Create a new sale
   */
  create: async (data: CreateSaleDto): Promise<Sale> => {
    const response = await apiClient.post('/sales', data);
    return response.data;
  },

  /**
   * Update an existing sale
   */
  update: async (id: string, data: UpdateSaleDto): Promise<Sale> => {
    const response = await apiClient.patch(`/sales/${id}`, data);
    return response.data;
  },

  /**
   * Cancel a sale
   */
  cancel: async (id: string): Promise<Sale> => {
    const response = await apiClient.patch(`/sales/${id}/cancel`);
    return response.data;
  },

  /**
   * Get sales statistics
   */
  getStats: async (): Promise<SalesStats> => {
    const response = await apiClient.get('/sales/stats');
    return response.data;
  },

  /**
   * Get today's sales
   */
  getToday: async (): Promise<Sale[]> => {
    const response = await apiClient.get('/sales/today');
    return response.data;
  },

  /**
   * Get sales by date range
   */
  getByDateRange: async (startDate: string, endDate: string): Promise<Sale[]> => {
    const response = await apiClient.get(
      `/sales/range?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  },
};
