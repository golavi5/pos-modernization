import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID',
  })
  id: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'User email',
  })
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  name: string;

  @ApiProperty({
    example: 'John',
    description: 'First name',
  })
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name',
  })
  last_name: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
  })
  phone: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Company ID',
  })
  company_id: string;

  @ApiProperty({
    example: true,
    description: 'User active status',
  })
  is_active: boolean;

  @ApiProperty({
    example: '2026-02-13T10:00:00Z',
    description: 'Last login timestamp',
  })
  last_login: Date;

  @ApiProperty({
    example: ['admin', 'manager'],
    description: 'User roles',
  })
  roles: string[];

  @ApiProperty({
    example: '2026-02-13T09:00:00Z',
    description: 'Account creation timestamp',
  })
  created_at: Date;

  @ApiProperty({
    example: '2026-02-13T10:00:00Z',
    description: 'Last update timestamp',
  })
  updated_at: Date;

  // Never expose password hash
  @Exclude()
  password_hash: string;

  // Never expose deleted_at in response
  @Exclude()
  deleted_at: Date;
}
