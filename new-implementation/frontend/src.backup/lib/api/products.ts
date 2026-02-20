import { apiClient } from './client';
import type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductQueryParams,
  ProductsResponse,
  ProductStats,
} from '@/types/product';

export const productsApi = {
  /**
   * Get all products with pagination and filters
   */
  getAll: async (params?: ProductQueryParams): Promise<ProductsResponse> => {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await apiClient.get(`/products?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get a single product by ID
   */
  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  /**
   * Create a new product
   */
  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await apiClient.post('/products', data);
    return response.data;
  },

  /**
   * Update an existing product
   */
  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await apiClient.patch(`/products/${id}`, data);
    return response.data;
  },

  /**
   * Delete a product (soft delete)
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  /**
   * Get product statistics
   */
  getStats: async (): Promise<ProductStats> => {
    const response = await apiClient.get('/products/stats');
    return response.data;
  },

  /**
   * Search products
   */
  search: async (query: string): Promise<Product[]> => {
    const response = await apiClient.get(`/products/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  /**
   * Get low stock products
   */
  getLowStock: async (): Promise<Product[]> => {
    const response = await apiClient.get('/products/low-stock');
    return response.data;
  },
};
