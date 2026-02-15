import { IsOptional, IsNumber, IsUUID, Min } from 'class-validator';

export class StockQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  low_stock_only?: boolean;
}
