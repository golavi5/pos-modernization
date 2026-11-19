import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsString, MaxLength } from 'class-validator';
import { FISCAL_SCOPES } from '../scopes';

export class CreateApiKeyDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: FISCAL_SCOPES, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(FISCAL_SCOPES, { each: true })
  scopes: string[];
}
