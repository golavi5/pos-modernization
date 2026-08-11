import { apiClient } from './client';

export const paymentsApi = {
  /**
   * Registra el pago de un pedido. Es la llamada que CIERRA la venta: el
   * backend mueve el pedido a `completed` y descuenta inventario cuando queda
   * totalmente pagado. Sin ella el pedido se queda en `draft`/`unpaid`.
   */
  record: async (
    orderId: string,
    data: { payment_method: string; amount: number },
  ) => {
    const response = await apiClient.post(`/sales/orders/${orderId}/payments`, data);
    return response.data;
  },
};
