import { IsString, IsOptional, IsUUID, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @IsUUID()
  company_id: string;
}