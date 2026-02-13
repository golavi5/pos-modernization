import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderStatus } from '../entities/order.entity';

export class OrderQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @MaxLength(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  customer_id?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  company_id?: number;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  endDate?: Date;
}