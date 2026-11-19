import { apiClient } from './client';
import type { SaleFiscalStatus } from '@/types/fiscal';

export const fiscalApi = {
  getSaleStatus: async (orderId: string): Promise<SaleFiscalStatus> => {
    const response = await apiClient.get(`/fiscal/v1/sales/${orderId}/status`);
    return response.data;
  },
};
