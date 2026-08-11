import {
  IsBoolean,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ProductQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsString()
  sort?: string = 'created_at';

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';

  // `@Transform` produce un booleano, así que el validador tiene que ser
  // `@IsBoolean()`. Con `@IsString()` esto rechazaba SIEMPRE —incluso un
  // `GET /products` sin parámetros— porque el valor por defecto de abajo hace
  // que `@IsOptional()` nunca entre en juego: la propiedad siempre está
  // presente, se transforma a booleano y el validador de string la tumba.
  // El catálogo entero devolvía 400 (dry-run 2026-08-11, D1).
  //
  // El transform también tiene que mapear "ausente" a `true` explícitamente:
  // sin eso, `undefined === 'true'` daba `false` y el default se invertía,
  // ocultando los productos activos en vez de mostrarlos.
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? true : value === 'true' || value === true,
  )
  @IsBoolean()
  is_active?: boolean = true;
}