import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminUpdateUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  firstName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  lastName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AssignRolesDto {
  @ApiProperty({
    example: ['uuid-role-1', 'uuid-role-2'],
    description: 'Array of role IDs to assign (replaces existing)',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}

export class AdminResetPasswordDto {
  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @MaxLength(255)
  newPassword: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  forceChangeOnLogin?: boolean = false;
}
