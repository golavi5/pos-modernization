import { Body, Controller, Get, HttpCode, Patch, Put, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { User } from '../../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { FiscalExceptionFilter } from '../../common/fiscal-exception.filter';
import { PlemsiConfigService } from './plemsi-config.service';
import { PLEMSI_BASE_URL, PlemsiEnvironment } from './plemsi.constants';

export class SetPlemsiConfigDto {
  @ApiProperty({ enum: Object.keys(PLEMSI_BASE_URL) })
  @IsIn(Object.keys(PLEMSI_BASE_URL))
  environment: PlemsiEnvironment;

  @ApiProperty({ description: 'Write-only. Stored envelope-encrypted, never returned.' })
  @IsString()
  @MinLength(8)
  @MaxLength(4096)
  token: string;
}

export class ConfigureEmissionDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ required: false, description: 'Authorised POS numbering prefix' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  pos_prefix?: string;

  @ApiProperty({ required: false, description: 'Authorised POS numbering resolution' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  pos_resolution?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(16) invoice_prefix?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(32) invoice_resolution?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(16) credit_note_prefix?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(32) credit_note_resolution?: string;
}

/** Plemsi credentials of the signed-in tenant admin's issuer (POS JWT). `@Roles` per handler: RolesGuard ignores class-level metadata. */
@ApiTags('fiscal-v1')
@ApiBearerAuth('access-token')
@Controller('fiscal/v1/admin/plemsi-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(FiscalExceptionFilter)
export class PlemsiConfigController {
  constructor(private readonly config: PlemsiConfigService) {}

  @Put()
  @Roles('admin', 'superadmin')
  @HttpCode(204)
  async set(@CurrentUser() user: User, @Body() dto: SetPlemsiConfigDto) {
    await this.config.set(user.company_id, dto.environment, dto.token);
  }

  @Patch('emission')
  @Roles('admin', 'superadmin')
  @HttpCode(204)
  async configureEmission(@CurrentUser() user: User, @Body() dto: ConfigureEmissionDto) {
    await this.config.configureEmission(user.company_id, dto);
  }

  @Get()
  @Roles('admin', 'superadmin')
  get(@CurrentUser() user: User) {
    return this.config.describe(user.company_id);
  }
}
