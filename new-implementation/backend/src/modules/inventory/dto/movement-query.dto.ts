import { IsOptional, IsNumber, IsUUID, IsEnum, Min } from 'class-validator';
import { MovementType } from '../entities/stock-movement.entity';

export class MovementQueryDto {
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
  product_id?: string;

  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsEnum(MovementType)
  movement_type?: MovementType;

  @IsOptional()
  start_date?: string;

  @IsOptional()
  end_date?: string;
}
