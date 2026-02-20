export declare class TopSellingProductDto {
    productId: string;
    productName: string;
    sku: string;
    category: string;
    totalQuantitySold: number;
    totalRevenue: number;
    averagePrice: number;
    transactionCount: number;
}
export declare class LowStockProductDto {
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    reorderPoint: number;
    stockLevel: string;
    warehouseName: string;
    daysUntilStockout?: number;
}
export declare class InventoryTurnoverDto {
    productId: string;
    productName: string;
    sku: string;
    averageStock: number;
    totalSold: number;
    turnoverRate: number;
    daysOfInventory: number;
    category: string;
    status: string;
}
export declare class ProductReportDto {
    topSelling: TopSellingProductDto[];
    lowStock: LowStockProductDto[];
    generatedAt: Date;
}
export declare class InventoryReportDto {
    turnover: InventoryTurnoverDto[];
    averageTurnoverRate: number;
    totalProducts: number;
    fastMovingCount: number;
    slowMovingCount: number;
    deadStockCount: number;
    generatedAt: Date;
}
