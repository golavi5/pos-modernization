import { IsOptional, IsString, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserSortField {
  NAME = 'name',
  EMAIL = 'email',
  CREATED_AT = 'created_at',
  LAST_LOGIN = 'last_login',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class UserQueryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, enum: UserSortField, default: UserSortField.CREATED_AT })
  @IsEnum(UserSortField)
  @IsOptional()
  sortBy?: UserSortField = UserSortField.CREATED_AT;

  @ApiProperty({ required: false, enum: SortOrder, default: SortOrder.DESC })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}
