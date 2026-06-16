import { IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_RULE_MESSAGE,
} from '../../../common/password-policy';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123!',
    description: 'Current password',
  })
  @IsNotEmpty({ message: 'Current password is required' })
  oldPassword: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: PASSWORD_RULE_MESSAGE,
  })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_RULE_MESSAGE })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULE_MESSAGE })
  newPassword: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'Password confirmation',
  })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}
