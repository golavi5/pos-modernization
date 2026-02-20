import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@/lib/api/sales';
import type { CreateSaleDto, UpdateSaleDto, SaleQueryParams } from '@/types/sale';

export const SALES_QUERY_KEY = 'sales';

/**
 * Hook to fetch all sales with pagination and filters
 */
export function useSales(params?: SaleQueryParams) {
  return useQuery({
    queryKey: [SALES_QUERY_KEY, params],
    queryFn: () => salesApi.getAll(params),
  });
}

/**
 * Hook to fetch a single sale by ID
 */
export function useSale(id: string) {
  return useQuery({
    queryKey: [SALES_QUERY_KEY, id],
    queryFn: () => salesApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch sales statistics
 */
export function useSalesStats() {
  return useQuery({
    queryKey: [SALES_QUERY_KEY, 'stats'],
    queryFn: () => salesApi.getStats(),
  });
}

/**
 * Hook to fetch today's sales
 */
export function useTodaySales() {
  return useQuery({
    queryKey: [SALES_QUERY_KEY, 'today'],
    queryFn: () => salesApi.getToday(),
  });
}

/**
 * Hook to fetch sales by date range
 */
export function useSalesByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [SALES_QUERY_KEY, 'range', startDate, endDate],
    queryFn: () => salesApi.getByDateRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

/**
 * Hook to create a new sale
 */
export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSaleDto) => salesApi.create(data),
    onSuccess: () => {
      // Invalidate sales list and stats
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY] });
    },
  });
}

/**
 * Hook to update an existing sale
 */
export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSaleDto }) =>
      salesApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific sale and sales list
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY] });
    },
  });
}

/**
 * Hook to cancel a sale
 */
export function useCancelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salesApi.cancel(id),
    onSuccess: () => {
      // Invalidate sales list
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY] });
    },
  });
}
