import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@/lib/api/sales';
import { paymentsApi } from '@/lib/api/payments';
import { PRODUCTS_QUERY_KEY } from './useProducts';
import { INVENTORY_QUERY_KEY } from './useInventory';
import type {
  CreateSaleDto,
  UpdateSaleDto,
  SaleQueryParams,
  RecordPaymentDto,
} from '@/types/sale';

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
    // El `QueryClient` global trae `mutations: { retry: 1 }`. Sobre un POST no
    // idempotente eso es un pedido duplicado cada vez que la red falla después
    // de que el backend ya lo creó — y un reintento automático no es una
    // decisión de la caja. Un pedido por carrito, y el reintento lo pide una
    // persona.
    retry: false,
    onSuccess: () => {
      // Invalidate sales list and stats
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY] });
    },
  });
}

/**
 * Registra el pago que CIERRA la venta.
 *
 * Va como mutación —y no como una llamada suelta a `paymentsApi.record`—
 * porque es aquí donde el backend descuenta stock e inserta el
 * `StockMovement`. `useCreateSale` sólo invalida `['sales']`, y crear el
 * pedido no toca inventario: con el `staleTime` de 5 min, la rejilla de la
 * caja seguía mostrando el stock anterior después de cada venta, y las guardas
 * de `handleAddProduct` (`quantity >= stock_quantity`) decidían sobre ese dato
 * rancio.
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: RecordPaymentDto }) =>
      paymentsApi.record(orderId, data),
    // Igual que en `useCreateSale`, y aquí es dinero: con el `retry: 1` global,
    // un timeout sobre un pago que SÍ llegó reenviaba el cobro solo, sin que
    // nadie lo pidiera, y dejaba un segundo `Payment` (un sobrepago que alguien
    // tiene que ir a resolver a mano). Reintentar un cobro es una decisión de
    // la caja, no del cliente HTTP.
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      // El pago también deja un movimiento de stock: la misma caché rancia
      // afecta a las vistas de inventario.
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
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
