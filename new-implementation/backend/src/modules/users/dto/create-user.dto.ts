import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
  IsArray,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminCreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'john@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase and number',
  })
  password: string;

  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  lastName?: string;

  @ApiProperty({ example: '300-555-1234', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({
    example: ['uuid-role-1'],
    description: 'Array of role IDs to assign',
    required: false,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  roleIds?: string[];
}
