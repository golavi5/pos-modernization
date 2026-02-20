export declare class TopCustomerDto {
    customerId: number;
    customerName: string;
    email: string;
    phone: string;
    totalPurchases: number;
    totalSpent: number;
    averageTicket: number;
    lastPurchaseDate: Date;
    loyaltyPoints: number;
}
export declare class CustomerSegmentDto {
    segment: string;
    customerCount: number;
    totalRevenue: number;
    averageSpent: number;
    percentage: number;
}
export declare class CustomerReportDto {
    topBuyers: TopCustomerDto[];
    segments: CustomerSegmentDto[];
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    generatedAt: Date;
}
