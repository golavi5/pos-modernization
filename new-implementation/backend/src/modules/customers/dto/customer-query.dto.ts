import { IsOptional, IsNumber, IsString, Min } from 'class-validator';

export class CustomerQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort_by?: 'name' | 'total_purchases' | 'last_purchase_date' | 'created_at';

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'ASC';
}
