import { apiClient } from './client';
import type {
  Settings,
  UpdateCompanyDto,
  UpdateTaxDto,
  UpdatePaymentMethodsDto,
  UpdateInventoryDto,
  UpdateSalesDto,
  UpdateLoyaltyDto,
} from '@/types/settings';

const BASE = '/settings';

export const settingsApi = {
  get: () => apiClient.get<Settings>(BASE),
  updateCompany: (dto: UpdateCompanyDto) => apiClient.patch<Settings>(`${BASE}/company`, dto),
  updateTax: (dto: UpdateTaxDto) => apiClient.patch<Settings>(`${BASE}/tax`, dto),
  updatePaymentMethods: (dto: UpdatePaymentMethodsDto) => apiClient.patch<Settings>(`${BASE}/payment-methods`, dto),
  updateInventory: (dto: UpdateInventoryDto) => apiClient.patch<Settings>(`${BASE}/inventory`, dto),
  updateSales: (dto: UpdateSalesDto) => apiClient.patch<Settings>(`${BASE}/sales`, dto),
  updateLoyalty: (dto: UpdateLoyaltyDto) => apiClient.patch<Settings>(`${BASE}/loyalty`, dto),
  resetToDefaults: () => apiClient.patch<Settings>(`${BASE}/reset`),
};
