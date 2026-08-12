import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber, Min, Max, IsBoolean, IsUrl, IsUUID, Length, Matches } from 'class-validator';
import { emptyToUndefined } from './create-product.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Ver `create-product.dto.ts`: mismo relajamiento, mismo motivo — el
  // placeholder de la UI es `PRD-001` y el patrón viejo lo rechazaba.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(1, 100)
  @Matches(/^[A-Z0-9][A-Z0-9._-]*$/, {
    message: 'SKU must contain only letters, numbers, dots, dashes and underscores',
  })
  sku?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
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
  @Transform(emptyToUndefined)
  @IsUrl()
  image_url?: string;
}