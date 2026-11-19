import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { responsibilityCodesProp } from '../../common/responsibility-codes';

export class CreateThirdPartyDto {
  @ApiProperty({ example: '800197268-4', description: 'NIT with verification digit, e.g. 900123456-8' })
  @IsString()
  @MaxLength(32)
  nit: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @responsibilityCodesProp()
  responsibility_codes: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  notification_email?: string;

  @ApiPropertyOptional({ description: 'Loose reference to a POS customer; never joined across contexts' })
  @IsOptional()
  @IsUUID()
  customer_id?: string;
}
