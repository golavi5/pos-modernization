import { Transform } from 'class-transformer';
import {
  IsString, IsOptional, IsNumber, Min, Max, IsBoolean, IsUrl, IsUUID, Length, Matches,
} from 'class-validator';

/**
 * `@IsOptional()` de class-validator solo ignora `null` y `undefined`, nunca `''`.
 * El formulario de la UI inicializa `barcode` e `image_url` a cadena vacía y los
 * manda tal cual, así que sin esto un alta con esos campos en blanco —el caso
 * normal— devuelve 400. Se normaliza aquí, en el límite de la API, no en el
 * formulario: la API no debe rechazar `""` en un campo opcional venga de donde venga.
 */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateProductDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  description?: string;

  // El catálogo legado son 30.276 SKUs estrictamente [A-Z0-9], así que relajar
  // el patrón no invalida ninguno. Se relaja porque el placeholder del propio
  // campo en la UI es `PRD-001`, que el patrón viejo rechazaba.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(1, 100)
  @Matches(/^[A-Z0-9][A-Z0-9._-]*$/, {
    message: 'SKU must contain only letters, numbers, dots, dashes and underscores',
  })
  sku: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(1, 100)
  barcode?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsNumber()
  @Min(0)
  stock_quantity: number;

  // La columna es `default: 0` y el formulario no expone el campo.
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorder_level?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  tax_rate: number;

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
