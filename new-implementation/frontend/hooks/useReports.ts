import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import type { ReportQuery } from '@/types/reports';

export const reportKeys = {
  all: ['reports'] as const,
  salesSummary: (q: ReportQuery) => ['reports', 'sales', 'summary', q] as const,
  salesByPeriod: (q: ReportQuery) => ['reports', 'sales', 'by-period', q] as const,
  revenueTrends: (q: ReportQuery) => ['reports', 'revenue', 'trends', q] as const,
  topSelling: (q: ReportQuery) => ['reports', 'products', 'top-selling', q] as const,
  lowStock: (q: ReportQuery) => ['reports', 'products', 'low-stock', q] as const,
  productReport: (q: ReportQuery) => ['reports', 'products', 'report', q] as const,
  turnover: (q: ReportQuery) => ['reports', 'inventory', 'turnover', q] as const,
  warehouseValue: () => ['reports', 'inventory', 'warehouse-value'] as const,
  topCustomers: (q: ReportQuery) => ['reports', 'customers', 'top', q] as const,
  customerSegments: (q: ReportQuery) => ['reports', 'customers', 'segments', q] as const,
  customerReport: (q: ReportQuery) => ['reports', 'customers', 'report', q] as const,
};

const STALE = 5 * 60 * 1000; // 5 minutes

export function useSalesSummary(q: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.salesSummary(q),
    queryFn: () => reportsApi.getSalesSummary(q).then((r) => r.data),
    staleTime: STALE,
  });
}

export function useSalesByPeriod(q: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.salesByPeriod(q),
    queryFn: () => reportsApi.getSalesByPeriod(q).then((r) => r.data),
    staleTime: STALE,
  });
}

export function useRevenueTrends(q: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.revenueTrends(q),
    queryFn: () => reportsApi.getRevenueTrends(q).then((r) => r.data),
    staleTime: STALE,
  });
}

export function useTopSellingProducts(q: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.topSelling(q),
    queryFn: () => reportsApi.getTopSellingProducts(q).then((r) => r.data),
    staleTime: STALE,
  });
}

export function useLowStockProducts(q: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.lowStock(q),
    queryFn: () => reportsApi.getLowStockProducts(q).then((r) => r.data),
    staleTime: STALE,
  });
}

export function useProductReport(q: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.productReport(q),
    queryFn: () => reportsApi.getProductReport(q).then((r) => r.data),
    staleTime: STALE,
  });
}

export function useInventoryTurnover(q: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.turnover(q),
    queryFn: () => reportsApi.getInventoryTurnover(q).then((r) => r.data),
    staleTime: STALE,
  });
}

export function useInventoryValueByWarehouse() {
  return useQuery({
    queryKey: reportKeys.warehouseValue(),
    queryFn: () => reportsApi.getInventoryValueByWarehouse().then((r) => r.data),
    staleTime: STALE,
  });
}

export function useTopCustomers(q: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.topCustomers(q),
    queryFn: () => reportsApi.getTopCustomers(q).then((r) => r.data),
    staleTime: STALE,
  });
}

export function useCustomerSegments(q: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.customerSegments(q),
    queryFn: () => reportsApi.getCustomerSegments(q).then((r) => r.data),
    staleTime: STALE,
  });
}

export function useCustomerReport(q: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.customerReport(q),
    queryFn: () => reportsApi.getCustomerReport(q).then((r) => r.data),
    staleTime: STALE,
  });
}
