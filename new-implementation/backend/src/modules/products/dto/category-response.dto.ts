import { Exclude, Expose } from 'class-transformer';
import { IsUUID, IsString, IsBoolean, IsOptional, IsDate } from 'class-validator';

@Exclude()
export class CategoryResponseDto {
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
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @Expose()
  @IsBoolean()
  is_active: boolean;

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