import { ApiProperty } from '@nestjs/swagger';

export class SalesSummaryDto {
  @ApiProperty()
  totalSales: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  totalProfit: number;

  @ApiProperty()
  averageTicket: number;

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  period: string;

  @ApiProperty()
  comparedToLastPeriod?: {
    salesChange: number;
    revenueChange: number;
    profitChange: number;
  };
}

export class SalesByPeriodDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  totalSales: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  averageTicket: number;
}

export class SalesReportDto {
  @ApiProperty()
  summary: SalesSummaryDto;

  @ApiProperty({ type: [SalesByPeriodDto] })
  periodData: SalesByPeriodDto[];

  @ApiProperty()
  generatedAt: Date;
}

export class RevenueByPaymentMethodDto {
  @ApiProperty()
  paymentMethod: string;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  transactionCount: number;

  @ApiProperty()
  percentage: number;
}

export class RevenueTrendsDto {
  @ApiProperty({ type: [SalesByPeriodDto] })
  trends: SalesByPeriodDto[];

  @ApiProperty({ type: [RevenueByPaymentMethodDto] })
  byPaymentMethod: RevenueByPaymentMethodDto[];

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  generatedAt: Date;
}
