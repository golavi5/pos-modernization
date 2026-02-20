import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api/inventory';
import type {
  AdjustStockDto,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateLocationDto,
  StockQueryParams,
  MovementQueryParams,
} from '@/types/inventory';

export const INVENTORY_QUERY_KEY = 'inventory';
export const WAREHOUSES_QUERY_KEY = 'warehouses';
export const LOCATIONS_QUERY_KEY = 'locations';

/**
 * Hook to fetch stock levels
 */
export function useStock(params?: StockQueryParams) {
  return useQuery({
    queryKey: [INVENTORY_QUERY_KEY, 'stock', params],
    queryFn: () => inventoryApi.getStock(params),
  });
}

/**
 * Hook to fetch stock for a specific product
 */
export function useStockByProduct(productId: string) {
  return useQuery({
    queryKey: [INVENTORY_QUERY_KEY, 'stock', productId],
    queryFn: () => inventoryApi.getStockByProduct(productId),
    enabled: !!productId,
  });
}

/**
 * Hook to fetch stock movements
 */
export function useMovements(params?: MovementQueryParams) {
  return useQuery({
    queryKey: [INVENTORY_QUERY_KEY, 'movements', params],
    queryFn: () => inventoryApi.getMovements(params),
  });
}

/**
 * Hook to fetch a single movement
 */
export function useMovement(id: string) {
  return useQuery({
    queryKey: [INVENTORY_QUERY_KEY, 'movements', id],
    queryFn: () => inventoryApi.getMovementById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch warehouses
 */
export function useWarehouses() {
  return useQuery({
    queryKey: [WAREHOUSES_QUERY_KEY],
    queryFn: () => inventoryApi.getWarehouses(),
  });
}

/**
 * Hook to fetch a single warehouse
 */
export function useWarehouse(id: string) {
  return useQuery({
    queryKey: [WAREHOUSES_QUERY_KEY, id],
    queryFn: () => inventoryApi.getWarehouseById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch locations for a warehouse
 */
export function useLocations(warehouseId: string) {
  return useQuery({
    queryKey: [LOCATIONS_QUERY_KEY, warehouseId],
    queryFn: () => inventoryApi.getLocations(warehouseId),
    enabled: !!warehouseId,
  });
}

/**
 * Hook to fetch inventory statistics
 */
export function useInventoryStats() {
  return useQuery({
    queryKey: [INVENTORY_QUERY_KEY, 'stats'],
    queryFn: () => inventoryApi.getStats(),
  });
}

/**
 * Hook to adjust stock
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AdjustStockDto) => inventoryApi.adjustStock(data),
    onSuccess: () => {
      // Invalidate stock and movements
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
    },
  });
}

/**
 * Hook to create warehouse
 */
export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWarehouseDto) => inventoryApi.createWarehouse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WAREHOUSES_QUERY_KEY] });
    },
  });
}

/**
 * Hook to update warehouse
 */
export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarehouseDto }) =>
      inventoryApi.updateWarehouse(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [WAREHOUSES_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [WAREHOUSES_QUERY_KEY] });
    },
  });
}

/**
 * Hook to create location
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLocationDto) => inventoryApi.createLocation(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [LOCATIONS_QUERY_KEY, variables.warehouse_id],
      });
    },
  });
}

/**
 * Hook to update location
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLocationDto> }) =>
      inventoryApi.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_QUERY_KEY] });
    },
  });
}
