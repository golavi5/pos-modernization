import { apiClient } from './client';
import type { RecordPaymentDto } from '@/types/sale';

export const paymentsApi = {
  /**
   * Registra el pago de un pedido. Es la llamada que CIERRA la venta: el
   * backend mueve el pedido a `completed` y descuenta inventario cuando queda
   * totalmente pagado. Sin ella el pedido se queda en `draft`/`unpaid`.
   */
  record: async (orderId: string, data: RecordPaymentDto) => {
    const response = await apiClient.post(`/sales/orders/${orderId}/payments`, data);
    return response.data;
  },
};
