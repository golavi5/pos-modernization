import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '../entities/order.entity';

export class CreateOrderItemDto {
  @IsInt()
  @IsPositive()
  product_id: number;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsPositive()
  unit_price: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsInt()
  customer_id?: number;

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