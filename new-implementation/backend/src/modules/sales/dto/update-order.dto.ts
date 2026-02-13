import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto {
  @IsOptional()
  @IsInt()
  customer_id?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}