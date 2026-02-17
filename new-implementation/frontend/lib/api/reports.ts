import { apiClient } from './client';
import type {
  ReportQuery,
  ExportQuery,
  SalesSummary,
  SalesReport,
  RevenueTrends,
  TopSellingProduct,
  LowStockProduct,
  ProductReport,
  InventoryReport,
  TopCustomer,
  CustomerSegment,
  CustomerReport,
  InventoryValue,
} from '@/types/reports';

const BASE = '/reports';

export const reportsApi = {
  // Sales
  getSalesSummary: (query: ReportQuery = {}) =>
    apiClient.get<SalesSummary>(`${BASE}/sales/summary`, { params: query }),

  getSalesByPeriod: (query: ReportQuery = {}) =>
    apiClient.get<SalesReport>(`${BASE}/sales/by-period`, { params: query }),

  getRevenueTrends: (query: ReportQuery = {}) =>
    apiClient.get<RevenueTrends>(`${BASE}/revenue/trends`, { params: query }),

  // Products
  getTopSellingProducts: (query: ReportQuery = {}) =>
    apiClient.get<TopSellingProduct[]>(`${BASE}/products/top-selling`, { params: query }),

  getLowStockProducts: (query: ReportQuery = {}) =>
    apiClient.get<LowStockProduct[]>(`${BASE}/products/low-stock`, { params: query }),

  getProductReport: (query: ReportQuery = {}) =>
    apiClient.get<ProductReport>(`${BASE}/products/report`, { params: query }),

  // Inventory
  getInventoryTurnover: (query: ReportQuery = {}) =>
    apiClient.get<InventoryReport>(`${BASE}/inventory/turnover`, { params: query }),

  getInventoryValueByWarehouse: () =>
    apiClient.get<InventoryValue[]>(`${BASE}/inventory/value-by-warehouse`),

  // Customers
  getTopCustomers: (query: ReportQuery = {}) =>
    apiClient.get<TopCustomer[]>(`${BASE}/customers/top-buyers`, { params: query }),

  getCustomerSegments: (query: ReportQuery = {}) =>
    apiClient.get<CustomerSegment[]>(`${BASE}/customers/segments`, { params: query }),

  getCustomerReport: (query: ReportQuery = {}) =>
    apiClient.get<CustomerReport>(`${BASE}/customers/report`, { params: query }),

  // Export URLs
  exportSalesReport: (query: ExportQuery = {}) => {
    const params = new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${BASE}/export/sales?${params}`;
  },

  exportProductReport: (query: ExportQuery = {}) => {
    const params = new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${BASE}/export/products?${params}`;
  },

  exportCustomerReport: (query: ExportQuery = {}) => {
    const params = new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${BASE}/export/customers?${params}`;
  },
};
