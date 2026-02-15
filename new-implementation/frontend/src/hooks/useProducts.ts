import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/products';
import type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductQueryParams,
} from '@/types/product';

export const PRODUCTS_QUERY_KEY = 'products';

/**
 * Hook to fetch all products with pagination and filters
 */
export function useProducts(params?: ProductQueryParams) {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, params],
    queryFn: () => productsApi.getAll(params),
  });
}

/**
 * Hook to fetch a single product by ID
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch product statistics
 */
export function useProductStats() {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, 'stats'],
    queryFn: () => productsApi.getStats(),
  });
}

/**
 * Hook to fetch low stock products
 */
export function useLowStockProducts() {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, 'low-stock'],
    queryFn: () => productsApi.getLowStock(),
  });
}

/**
 * Hook to create a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDto) => productsApi.create(data),
    onSuccess: () => {
      // Invalidate products list to refetch
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    },
  });
}

/**
 * Hook to update an existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productsApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific product and products list
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    },
  });
}

/**
 * Hook to delete a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      // Invalidate products list to refetch
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    },
  });
}

/**
 * Hook to search products
 */
export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, 'search', query],
    queryFn: () => productsApi.search(query),
    enabled: query.length > 0,
  });
}
