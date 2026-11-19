import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { responsibilityCodesProp } from '../../common/responsibility-codes';

export class UpsertFiscalProfileDto {
  @ApiProperty({ example: '800197268-4' })
  @IsString()
  @MaxLength(32)
  nit: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  legal_name: string;

  @ApiPropertyOptional({ description: 'Free-form until the anexo table is loaded (VERIFY)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  regime?: string;

  @responsibilityCodesProp()
  responsibility_codes: string[];
}
