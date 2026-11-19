import { Body, Controller, Get, Put, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard, RequireScopes } from '../access/api-key.guard';
import { FiscalContext } from '../access/fiscal-context.decorator';
import { FiscalRequestContext } from '../access/scopes';
import { FiscalExceptionFilter } from '../common/fiscal-exception.filter';
import { UpsertFiscalProfileDto } from './dto/fiscal-profile.dto';
import { FiscalProfileService } from './fiscal-profile.service';

@ApiTags('fiscal-v1')
@ApiBearerAuth('fiscal-api-key')
@Controller('fiscal/v1/profile')
@UseGuards(ApiKeyGuard)
@UseFilters(FiscalExceptionFilter)
export class FiscalProfileController {
  constructor(private readonly service: FiscalProfileService) {}

  @Get()
  @RequireScopes('profile:read')
  get(@FiscalContext() ctx: FiscalRequestContext) {
    return this.service.get(ctx.issuerId);
  }

  @Put()
  @RequireScopes('profile:write')
  put(@FiscalContext() ctx: FiscalRequestContext, @Body() dto: UpsertFiscalProfileDto) {
    return this.service.upsert(ctx.issuerId, dto);
  }
}
