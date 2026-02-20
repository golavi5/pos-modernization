import {
  IsArray,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsUUID()
  product_id: string;

  @IsPositive()
  @Min(1)
  quantity: number;

  @IsPositive()
  unit_price: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsPositive()
  discount_amount?: number;
}
