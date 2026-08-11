import { apiClient } from './client';
import type {
  Sale,
  CreateSaleDto,
  UpdateSaleDto,
  SaleQueryParams,
  SalesResponse,
  SalesStats,
} from '@/types/sale';

/**
 * Rutas de ventas.
 *
 * El backend monta este dominio en `@Controller('sales')` pero cuelga los
 * pedidos de `orders/` y los informes de `reports/` — no en la raíz. Este
 * módulo apuntaba a `/sales`, `/sales/:id`, `/sales/stats`… y las SIETE
 * llamadas devolvían 404: el POS no podía registrar una venta y los widgets
 * del dashboard salían vacíos por el 404, no por falta de datos.
 * Encontrado en el dry-run del 2026-08-11 (D2). Rutas reales:
 *
 *   GET    /sales/orders            listado (page, limit, search, status,
 *                                   customer_id, startDate, endDate)
 *   GET    /sales/orders/:id        detalle
 *   POST   /sales/orders            crear
 *   PATCH  /sales/orders/:id/status cambiar estado
 *   DELETE /sales/orders/:id        cancelar
 *   GET    /sales/reports/daily     resumen del día (?date=)
 *   GET    /sales/reports/summary   resumen de rango (?startDate=&endDate=)
 */
export const salesApi = {
  /**
   * Get all sales with pagination and filters
   */
  getAll: async (params?: SaleQueryParams): Promise<SalesResponse> => {
    const searchParams = new URLSearchParams();

    // El backend espera `limit`, no `pageSize`, y `startDate`/`endDate` en
    // camelCase. Mandar los nombres viejos no daba error: el ValidationPipe
    // global usa `whitelist: true`, que descarta lo desconocido en silencio —
    // así que `pageSize=50` se ignoraba y siempre volvían 10 filas.
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('limit', params.pageSize.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.customer_id) searchParams.append('customer_id', params.customer_id);
    if (params?.start_date) searchParams.append('startDate', params.start_date);
    if (params?.end_date) searchParams.append('endDate', params.end_date);

    const qs = searchParams.toString();
    const response = await apiClient.get(`/sales/orders${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  /**
   * Get a single sale by ID
   */
  getById: async (id: string): Promise<Sale> => {
    const response = await apiClient.get(`/sales/orders/${id}`);
    return response.data;
  },

  /**
   * Create a new sale
   */
  create: async (data: CreateSaleDto): Promise<Sale> => {
    const response = await apiClient.post('/sales/orders', data);
    return response.data;
  },

  /**
   * Update an existing sale. El backend sólo expone cambio de estado.
   */
  update: async (id: string, data: UpdateSaleDto): Promise<Sale> => {
    const response = await apiClient.patch(`/sales/orders/${id}/status`, data);
    return response.data;
  },

  /**
   * Cancel a sale. Es un DELETE en el backend, no un PATCH `/cancel`.
   */
  cancel: async (id: string): Promise<Sale> => {
    const response = await apiClient.delete(`/sales/orders/${id}`);
    return response.data;
  },

  /**
   * Get sales statistics.
   *
   * Devuelve el `SalesSummaryDto` del backend. Si algún widget espera otra
   * forma, el mapeo va en el consumidor: aquí no se inventa una traducción
   * que oculte una discrepancia de contrato.
   */
  getStats: async (): Promise<SalesStats> => {
    const response = await apiClient.get('/sales/reports/summary');
    return response.data;
  },

  /**
   * Get today's sales (resumen del día, no la lista de pedidos).
   */
  getToday: async (): Promise<Sale[]> => {
    const response = await apiClient.get('/sales/reports/daily');
    return response.data;
  },

  /**
   * Get sales by date range
   */
  getByDateRange: async (startDate: string, endDate: string): Promise<Sale[]> => {
    const response = await apiClient.get(
      `/sales/reports/summary?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  },
};
