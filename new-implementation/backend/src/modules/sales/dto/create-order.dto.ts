import {
  IsArray,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsUUID()
  product_id: string;

  @Type(() => Number)
  @IsPositive()
  @Min(1)
  quantity: number;

  // `@Type(() => Number)` no es decorativo: MySQL devuelve DECIMAL como string,
  // así que `GET /products` entrega `price: "25000.00"` y el carrito lo reenvía
  // tal cual. Sin la coerción, `@IsPositive()` veía un string y rechazaba la
  // venta con "items.0.unit_price must be a positive number".
  @Type(() => Number)
  @IsPositive()
  unit_price: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  // `@Min(0)`, NO `@IsPositive()`: cero no es positivo, así que una venta sin
  // descuento —el caso normal— se rechazaba con "discount_amount must be a
  // positive number" en cuanto el carrito mandaba `discount_amount: 0`.
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  discount_amount?: number;
}
