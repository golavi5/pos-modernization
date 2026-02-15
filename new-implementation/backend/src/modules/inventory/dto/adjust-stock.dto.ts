import { IsUUID, IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { MovementType } from '../entities/stock-movement.entity';

export class AdjustStockDto {
  @IsUUID()
  product_id: string;

  @IsUUID()
  location_id: string;

  @IsEnum(MovementType)
  movement_type: MovementType;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  reference_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
