import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard, RequireScopes } from '../access/api-key.guard';
import { FiscalContext } from '../access/fiscal-context.decorator';
import { FiscalRequestContext } from '../access/scopes';
import { FiscalExceptionFilter } from '../common/fiscal-exception.filter';
import { Idempotent, IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { PageQueryDto } from '../common/pagination';
import { CreateThirdPartyDto } from './dto/third-party.dto';
import { ThirdPartiesService } from './third-parties.service';

@ApiTags('fiscal-v1')
@ApiBearerAuth('fiscal-api-key')
@Controller('fiscal/v1/third-parties')
@UseGuards(ApiKeyGuard)
@UseFilters(FiscalExceptionFilter)
@UseInterceptors(IdempotencyInterceptor)
export class ThirdPartiesController {
  constructor(private readonly service: ThirdPartiesService) {}

  @Post()
  @Idempotent()
  @RequireScopes('third-parties:write')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  create(@FiscalContext() ctx: FiscalRequestContext, @Body() dto: CreateThirdPartyDto) {
    return this.service.create(ctx.issuerId, dto);
  }

  @Get()
  @RequireScopes('third-parties:read')
  list(@FiscalContext() ctx: FiscalRequestContext, @Query() q: PageQueryDto) {
    return this.service.list(ctx.issuerId, q);
  }

  @Get(':id')
  @RequireScopes('third-parties:read')
  get(@FiscalContext() ctx: FiscalRequestContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(ctx.issuerId, id);
  }
}
