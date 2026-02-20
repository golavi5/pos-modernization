import { apiClient } from './client';
import type {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryParams,
  CustomersResponse,
  CustomerStats,
  UpdateLoyaltyPointsDto,
  PurchaseHistory,
} from '@/types/customer';

export const customersApi = {
  /**
   * Get all customers with pagination and filters
   */
  getAll: async (params?: CustomerQueryParams): Promise<CustomersResponse> => {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    if (params?.minLoyaltyPoints !== undefined) searchParams.append('minLoyaltyPoints', params.minLoyaltyPoints.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await apiClient.get(`/customers?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get a single customer by ID
   */
  getById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
  },

  /**
   * Create a new customer
   */
  create: async (data: CreateCustomerDto): Promise<Customer> => {
    const response = await apiClient.post('/customers', data);
    return response.data;
  },

  /**
   * Update an existing customer
   */
  update: async (id: string, data: UpdateCustomerDto): Promise<Customer> => {
    const response = await apiClient.patch(`/customers/${id}`, data);
    return response.data;
  },

  /**
   * Delete a customer (soft delete)
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },

  /**
   * Get customer statistics
   */
  getStats: async (): Promise<CustomerStats> => {
    const response = await apiClient.get('/customers/stats');
    return response.data;
  },

  /**
   * Get top customers by total purchases
   */
  getTopCustomers: async (limit: number = 10): Promise<Customer[]> => {
    const response = await apiClient.get(`/customers/top?limit=${limit}`);
    return response.data;
  },

  /**
   * Advanced customer search
   */
  search: async (params: CustomerQueryParams): Promise<Customer[]> => {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.append('search', params.search);
    if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    if (params.minLoyaltyPoints !== undefined) searchParams.append('minLoyaltyPoints', params.minLoyaltyPoints.toString());
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await apiClient.get(`/customers/search?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get customer purchase history
   */
  getPurchaseHistory: async (id: string, limit: number = 10): Promise<PurchaseHistory[]> => {
    const response = await apiClient.get(`/customers/${id}/purchase-history?limit=${limit}`);
    return response.data;
  },

  /**
   * Update customer loyalty points
   */
  updateLoyaltyPoints: async (id: string, data: UpdateLoyaltyPointsDto): Promise<Customer> => {
    const response = await apiClient.patch(`/customers/${id}/loyalty`, data);
    return response.data;
  },
};
