import { IsOptional, IsNumber, IsUUID, IsEnum, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { MovementType } from '../entities/stock-movement.entity';

export class MovementQueryDto {
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
  pageSize?: number = 10;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsEnum(MovementType)
  movement_type?: MovementType;

  @IsOptional()
  start_date?: string;

  @IsOptional()
  end_date?: string;
}
