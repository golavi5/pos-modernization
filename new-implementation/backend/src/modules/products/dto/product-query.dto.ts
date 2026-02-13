import { IsOptional, IsNumber, IsString, IsUUID, Min, Max } from 'class-validator';
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

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsString()
  is_active?: boolean = true;
}