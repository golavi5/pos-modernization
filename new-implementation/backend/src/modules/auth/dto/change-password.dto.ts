import { IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123!',
    description: 'Current password',
  })
  @IsNotEmpty({ message: 'Current password is required' })
  oldPassword: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'New password (min 8 chars, uppercase, lowercase, number, special char)',
  })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'New password must contain uppercase, lowercase, number and special character',
    },
  )
  newPassword: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'Password confirmation',
  })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}
