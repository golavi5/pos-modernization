import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  IsBoolean,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_RULE_MESSAGE,
} from '../../../common/password-policy';

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
  @ApiProperty({ example: 'NewSecurePass123!', description: PASSWORD_RULE_MESSAGE })
  @IsString()
  @MaxLength(255)
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_RULE_MESSAGE })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULE_MESSAGE })
  newPassword: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  forceChangeOnLogin?: boolean = false;
}
