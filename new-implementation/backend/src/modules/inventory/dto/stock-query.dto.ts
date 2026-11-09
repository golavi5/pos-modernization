import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class StockQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  low_stock?: boolean;
}
