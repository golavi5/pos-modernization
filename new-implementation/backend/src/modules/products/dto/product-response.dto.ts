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
  @IsOptional()
  @IsNumber()
  tax_rate: number | null;

  /** La tasa que se aplicaría hoy: la del producto o, si no tiene, la de la empresa. */
  @Expose()
  @IsNumber()
  effective_tax_rate: number;

  /** El precio incluye el IVA (ajuste de la empresa, SPEC-BACK-010). */
  @Expose()
  @IsBoolean()
  price_includes_tax: boolean;

  @Expose()
  @IsBoolean()
  is_active: boolean;

  @Expose()
  @IsOptional()
  @IsBoolean()
  allow_sale_without_stock?: boolean | null;

  /**
   * Resuelto por el backend: `allow_sale_without_stock ?? settings.allowNegativeStock`.
   */
  @Expose()
  @IsBoolean()
  can_sell_without_stock: boolean;

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