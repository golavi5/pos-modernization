import { IsString, IsOptional, IsNumber, Min, Max, IsBoolean, IsUrl, IsUUID, Length, Matches } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(/^[A-Z0-9]+$/, { 
    message: 'SKU must contain only uppercase letters and numbers' 
  })
  sku?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  barcode?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorder_level?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tax_rate?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  // Tri-estado: `null` significa "heredar de settings.allowNegativeStock".
  // Ver `can-sell-without-stock.ts`.
  @IsOptional()
  @IsBoolean()
  allow_sale_without_stock?: boolean | null;

  @IsOptional()
  @IsUrl()
  image_url?: string;
}