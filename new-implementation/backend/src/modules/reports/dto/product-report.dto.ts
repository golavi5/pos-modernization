import { ApiProperty } from '@nestjs/swagger';

export class TopSellingProductDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  totalQuantitySold: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  averagePrice: number;

  @ApiProperty()
  transactionCount: number;
}

export class LowStockProductDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  currentStock: number;

  @ApiProperty()
  reorderPoint: number;

  @ApiProperty()
  stockLevel: string; // 'critical' | 'low' | 'ok'

  @ApiProperty()
  warehouseName: string;

  @ApiProperty()
  daysUntilStockout?: number;
}

export class InventoryTurnoverDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  averageStock: number;

  @ApiProperty()
  totalSold: number;

  @ApiProperty()
  turnoverRate: number; // times per period

  @ApiProperty()
  daysOfInventory: number;

  @ApiProperty()
  category: string;

  @ApiProperty()
  status: string; // 'fast-moving' | 'slow-moving' | 'dead-stock'
}

export class ProductReportDto {
  @ApiProperty({ type: [TopSellingProductDto] })
  topSelling: TopSellingProductDto[];

  @ApiProperty({ type: [LowStockProductDto] })
  lowStock: LowStockProductDto[];

  @ApiProperty()
  generatedAt: Date;
}

export class InventoryReportDto {
  @ApiProperty({ type: [InventoryTurnoverDto] })
  turnover: InventoryTurnoverDto[];

  @ApiProperty()
  averageTurnoverRate: number;

  @ApiProperty()
  totalProducts: number;

  @ApiProperty()
  fastMovingCount: number;

  @ApiProperty()
  slowMovingCount: number;

  @ApiProperty()
  deadStockCount: number;

  @ApiProperty()
  generatedAt: Date;
}
