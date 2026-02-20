export declare class SalesSummaryDto {
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
export declare class SalesByPeriodDto {
    date: string;
    totalSales: number;
    totalRevenue: number;
    totalItems: number;
    averageTicket: number;
}
export declare class SalesReportDto {
    summary: SalesSummaryDto;
    periodData: SalesByPeriodDto[];
    generatedAt: Date;
}
export declare class RevenueByPaymentMethodDto {
    paymentMethod: string;
    totalRevenue: number;
    transactionCount: number;
    percentage: number;
}
export declare class RevenueTrendsDto {
    trends: SalesByPeriodDto[];
    byPaymentMethod: RevenueByPaymentMethodDto[];
    totalRevenue: number;
    generatedAt: Date;
}
