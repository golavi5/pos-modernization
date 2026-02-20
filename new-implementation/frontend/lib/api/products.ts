import { apiClient } from './client';
import type {
  Product,
  Category,
  ProductQueryParams,
  ProductStats,
  CreateProductDto,
  UpdateProductDto,
} from '@/types/product';

// Re-export types for backwards compatibility
export type { Product, Category, ProductQueryParams, ProductStats };

export const productsApi = {
  // Products
  list: async (params: ProductQueryParams = {}) => {
    const { data } = await apiClient.get('/products', { params });
    return data;
  },

  getStats: async (): Promise<ProductStats> => {
    const { data } = await apiClient.get('/products/stats');
    return data;
  },

  getById: async (id: string): Promise<Product> => {
    const { data } = await apiClient.get(`/products/${id}`);
    return data;
  },

  create: async (product: CreateProductDto): Promise<Product> => {
    const { data } = await apiClient.post('/products', product);
    return data;
  },

  update: async (id: string, product: UpdateProductDto): Promise<Product> => {
    const { data } = await apiClient.put(`/products/${id}`, product);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  // Categories
  listCategories: async (): Promise<Category[]> => {
    const { data } = await apiClient.get('/products/categories');
    return data;
  },

  createCategory: async (category: Partial<Category>): Promise<Category> => {
    const { data } = await apiClient.post('/products/categories', category);
    return data;
  },

  updateCategory: async (id: string, category: Partial<Category>): Promise<Category> => {
    const { data } = await apiClient.put(`/products/categories/${id}`, category);
    return data;
  },
};
