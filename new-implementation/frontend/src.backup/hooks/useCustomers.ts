import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api/customers';
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryParams,
  UpdateLoyaltyPointsDto,
} from '@/types/customer';

export const CUSTOMERS_QUERY_KEY = 'customers';

/**
 * Hook to fetch all customers with pagination and filters
 */
export function useCustomers(params?: CustomerQueryParams) {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, params],
    queryFn: () => customersApi.getAll(params),
  });
}

/**
 * Hook to fetch a single customer by ID
 */
export function useCustomer(id: string) {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, id],
    queryFn: () => customersApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch customer statistics
 */
export function useCustomerStats() {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, 'stats'],
    queryFn: () => customersApi.getStats(),
  });
}

/**
 * Hook to fetch top customers
 */
export function useTopCustomers(limit: number = 10) {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, 'top', limit],
    queryFn: () => customersApi.getTopCustomers(limit),
  });
}

/**
 * Hook to search customers
 */
export function useSearchCustomers(params: CustomerQueryParams) {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, 'search', params],
    queryFn: () => customersApi.search(params),
    enabled: !!params.search || params.isActive !== undefined || params.minLoyaltyPoints !== undefined,
  });
}

/**
 * Hook to fetch customer purchase history
 */
export function useCustomerPurchaseHistory(id: string, limit: number = 10) {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, id, 'purchase-history', limit],
    queryFn: () => customersApi.getPurchaseHistory(id, limit),
    enabled: !!id,
  });
}

/**
 * Hook to create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerDto) => customersApi.create(data),
    onSuccess: () => {
      // Invalidate customers list and stats
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
}

/**
 * Hook to update an existing customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerDto }) =>
      customersApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific customer and customers list
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
}

/**
 * Hook to delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      // Invalidate customers list and stats
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
}

/**
 * Hook to update customer loyalty points
 */
export function useUpdateLoyaltyPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLoyaltyPointsDto }) =>
      customersApi.updateLoyaltyPoints(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific customer and customers list
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
}
