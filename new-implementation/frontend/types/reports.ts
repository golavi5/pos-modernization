// Report Query Types
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ReportQuery {
  period?: PeriodType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  warehouseId?: number;
  categoryId?: number;
}

export interface ExportQuery extends ReportQuery {
  format?: ExportFormat;
  filename?: string;
}

// Sales Report Types
export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageTicket: number;
  totalItems: number;
  period: string;
  comparedToLastPeriod?: {
    salesChange: number;
    revenueChange: number;
    profitChange: number;
  };
}

export interface SalesByPeriod {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalItems: number;
  averageTicket: number;
}

export interface SalesReport {
  summary: SalesSummary;
  periodData: SalesByPeriod[];
  generatedAt: string;
}

export interface RevenueByPaymentMethod {
  paymentMethod: string;
  totalRevenue: number;
  transactionCount: number;
  percentage: number;
}

export interface RevenueTrends {
  trends: SalesByPeriod[];
  byPaymentMethod: RevenueByPaymentMethod[];
  totalRevenue: number;
  generatedAt: string;
}

// Product Report Types
export interface TopSellingProduct {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  transactionCount: number;
}

export interface LowStockProduct {
  productId: number;
  productName: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  stockLevel: string;
  warehouseName: string;
  daysUntilStockout?: number;
}

export interface InventoryTurnover {
  productId: number;
  productName: string;
  sku: string;
  averageStock: number;
  totalSold: number;
  turnoverRate: number;
  daysOfInventory: number;
  category: string;
  status: string;
}

export interface ProductReport {
  topSelling: TopSellingProduct[];
  lowStock: LowStockProduct[];
  generatedAt: string;
}

export interface InventoryReport {
  turnover: InventoryTurnover[];
  averageTurnoverRate: number;
  totalProducts: number;
  fastMovingCount: number;
  slowMovingCount: number;
  deadStockCount: number;
  generatedAt: string;
}

// Customer Report Types
export interface TopCustomer {
  customerId: number;
  customerName: string;
  email: string;
  phone: string;
  totalPurchases: number;
  totalSpent: number;
  averageTicket: number;
  lastPurchaseDate: string;
  loyaltyPoints: number;
}

export interface CustomerSegment {
  segment: string;
  customerCount: number;
  totalRevenue: number;
  averageSpent: number;
  percentage: number;
}

export interface CustomerReport {
  topBuyers: TopCustomer[];
  segments: CustomerSegment[];
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  generatedAt: string;
}

// Inventory Value Types
export interface InventoryValue {
  warehouseId: number;
  warehouseName: string;
  productCount: number;
  totalUnits: number;
  totalValue: number;
}
