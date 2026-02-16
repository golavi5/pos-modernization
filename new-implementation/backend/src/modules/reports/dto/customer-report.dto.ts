import { ApiProperty } from '@nestjs/swagger';

export class TopCustomerDto {
  @ApiProperty()
  customerId: number;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  totalPurchases: number;

  @ApiProperty()
  totalSpent: number;

  @ApiProperty()
  averageTicket: number;

  @ApiProperty()
  lastPurchaseDate: Date;

  @ApiProperty()
  loyaltyPoints: number;
}

export class CustomerSegmentDto {
  @ApiProperty()
  segment: string; // 'vip' | 'regular' | 'new' | 'inactive'

  @ApiProperty()
  customerCount: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  averageSpent: number;

  @ApiProperty()
  percentage: number;
}

export class CustomerReportDto {
  @ApiProperty({ type: [TopCustomerDto] })
  topBuyers: TopCustomerDto[];

  @ApiProperty({ type: [CustomerSegmentDto] })
  segments: CustomerSegmentDto[];

  @ApiProperty()
  totalCustomers: number;

  @ApiProperty()
  activeCustomers: number; // purchased in last 30 days

  @ApiProperty()
  newCustomers: number; // registered in period

  @ApiProperty()
  generatedAt: Date;
}
