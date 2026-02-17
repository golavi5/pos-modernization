import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import type {
  UpdateCompanyDto,
  UpdateTaxDto,
  UpdatePaymentMethodsDto,
  UpdateInventoryDto,
  UpdateSalesDto,
  UpdateLoyaltyDto,
} from '@/types/settings';

const KEY = ['settings'];

export function useSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

function makeMutation<T>(fn: (dto: T) => Promise<any>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateCompanyDto) => settingsApi.updateCompany(dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateTaxDto) => settingsApi.updateTax(dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePaymentMethods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePaymentMethodsDto) => settingsApi.updatePaymentMethods(dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateInventorySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateInventoryDto) => settingsApi.updateInventory(dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateSalesSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateSalesDto) => settingsApi.updateSales(dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateLoyaltySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateLoyaltyDto) => settingsApi.updateLoyalty(dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useResetSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.resetToDefaults().then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
