import { apiClient } from './client';

export interface Product {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category_id?: string;
  price: number;
  cost: number;
  stock_quantity: number;
  reorder_level: number;
  tax_rate: number;
  is_active: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
  is_active?: boolean;
  sort_by?: string;
  order?: 'ASC' | 'DESC';
}

export const productsApi = {
  // Products
  list: async (params: ProductQueryParams = {}) => {
    const { data } = await apiClient.get('/products', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/products/${id}`);
    return data;
  },

  create: async (product: Partial<Product>) => {
    const { data } = await apiClient.post('/products', product);
    return data;
  },

  update: async (id: string, product: Partial<Product>) => {
    const { data } = await apiClient.put(`/products/${id}`, product);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await apiClient.delete(`/products/${id}`);
    return data;
  },

  // Categories
  listCategories: async () => {
    const { data } = await apiClient.get('/products/categories');
    return data;
  },

  createCategory: async (category: Partial<Category>) => {
    const { data } = await apiClient.post('/products/categories', category);
    return data;
  },

  updateCategory: async (id: string, category: Partial<Category>) => {
    const { data } = await apiClient.put(`/products/categories/${id}`, category);
    return data;
  },
};
