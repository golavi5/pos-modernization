import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api/customers';
import type {
  CustomerQueryParams,
  CreateCustomerDto,
  UpdateCustomerDto,
  UpdateLoyaltyPointsDto,
} from '@/types/customer';

export const useCustomers = (params: CustomerQueryParams = {}) => {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.getAll(params),
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getById(id),
    enabled: !!id,
  });
};

export const useCustomerStats = () => {
  return useQuery({
    queryKey: ['customerStats'],
    queryFn: () => customersApi.getStats(),
  });
};

export const useTopCustomers = (limit: number = 10) => {
  return useQuery({
    queryKey: ['topCustomers', limit],
    queryFn: () => customersApi.getTopCustomers(limit),
  });
};

export const useCustomerPurchaseHistory = (id: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['customerPurchaseHistory', id, limit],
    queryFn: () => customersApi.getPurchaseHistory(id, limit),
    enabled: !!id,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerDto) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customerStats'] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerDto }) =>
      customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customerStats'] });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customerStats'] });
    },
  });
};

export const useUpdateLoyaltyPoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLoyaltyPointsDto }) =>
      customersApi.updateLoyaltyPoints(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customerStats'] });
    },
  });
};
