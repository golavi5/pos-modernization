import { IsString, IsOptional, IsNumber, Min, Max, IsBoolean, IsUrl, IsUUID, IsPositive, Length, Matches } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @Length(1, 100)
  @Matches(/^[A-Z0-9]+$/, { 
    message: 'SKU must contain only uppercase letters and numbers' 
  })
  sku: string;

  @IsOptional()
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

  @IsNumber()
  @Min(0)
  reorder_level: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  tax_rate: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUrl()
  image_url?: string;

  @IsUUID()
  company_id: string;

  @IsUUID()
  created_by: string;
}