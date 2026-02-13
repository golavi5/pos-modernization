import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (expires in 1 hour)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token (expires in 7 days)',
  })
  refreshToken: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'Authenticated user information',
  })
  user: UserResponseDto;

  @ApiProperty({
    example: 3600,
    description: 'Access token expiration time in seconds',
  })
  expiresIn: number;

  @ApiProperty({
    example: 'Bearer',
    description: 'Token type',
  })
  tokenType: string;
}
