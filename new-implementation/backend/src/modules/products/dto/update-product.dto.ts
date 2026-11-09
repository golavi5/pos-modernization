import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber, Min, Max, IsBoolean, IsUrl, IsUUID, Length, Matches } from 'class-validator';

/**
 * Distinto de `emptyToUndefined` (create-product.dto.ts) a propósito: en
 * `update()`, `products.service.ts` hace `Object.assign(product,
 * updateProductDto)` y TypeORM's `save` trata `undefined` como "no tocar este
 * campo". Si aquí mapeáramos `''` a `undefined` como en el alta, vaciar el
 * campo desde el formulario de edición sería un no-op silencioso — antes de
 * este DTO compartir el transform de creación, `''` daba un 400 (`@Length(1,
 * 100)`), ruidoso pero correcto. `null` sí es un valor real para TypeORM: lo
 * escribe. `barcode` e `image_url` son columnas `nullable: true`, así que
 * NULL es válido en ambas.
 */
export const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

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
  @Transform(emptyToNull)
  @IsString()
  @Length(1, 100)
  barcode?: string | null;

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

  // Sin `@Min(0)`: tras una venta sin existencias el stock es negativo por
  // diseño (SPEC-BACK-004), y el formulario reenvía el producto entero al
  // editarlo — con el mínimo, un producto sobrevendido no se podía guardar.
  @IsOptional()
  @IsNumber()
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
  @Transform(emptyToNull)
  @IsUrl()
  image_url?: string | null;
}