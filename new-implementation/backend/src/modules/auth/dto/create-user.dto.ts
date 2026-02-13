import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address (unique)',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password (min 8 chars, uppercase, lowercase, number, special char)',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain uppercase, lowercase, number and special character',
    },
  )
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Company ID',
  })
  @IsNotEmpty({ message: 'Company ID is required' })
  company_id: string;

  @ApiProperty({
    example: 'John',
    description: 'First name (optional)',
    required: false,
  })
  first_name?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name (optional)',
    required: false,
  })
  last_name?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number (optional)',
    required: false,
  })
  phone?: string;
}
