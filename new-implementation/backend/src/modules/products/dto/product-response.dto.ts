import { Exclude, Expose } from 'class-transformer';
import { IsUUID, IsString, IsNumber, IsBoolean, IsOptional, IsDate, IsUrl } from 'class-validator';

@Exclude()
export class ProductResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsUUID()
  company_id: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @IsString()
  sku: string;

  @Expose()
  @IsOptional()
  @IsString()
  barcode?: string;

  @Expose()
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @Expose()
  @IsNumber()
  price: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  cost?: number;

  @Expose()
  @IsNumber()
  stock_quantity: number;

  @Expose()
  @IsNumber()
  reorder_level: number;

  @Expose()
  @IsNumber()
  tax_rate: number;

  @Expose()
  @IsBoolean()
  is_active: boolean;

  @Expose()
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @Expose()
  @IsDate()
  created_at: Date;

  @Expose()
  @IsDate()
  updated_at: Date;

  @Expose()
  @IsOptional()
  @IsDate()
  deleted_at?: Date;
}