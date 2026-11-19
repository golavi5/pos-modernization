import {
  Body, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Query, Res, StreamableFile, UseFilters, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiKeyGuard, RequireScopes } from '../access/api-key.guard';
import { FiscalContext } from '../access/fiscal-context.decorator';
import { FiscalRequestContext } from '../access/scopes';
import { FiscalExceptionFilter } from '../common/fiscal-exception.filter';
import { Idempotent, IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { CreateDocumentDto, DocumentListQueryDto } from './document.dto';
import { DocumentsService } from './documents.service';

@ApiTags('fiscal-v1')
@ApiBearerAuth('fiscal-api-key')
@Controller('fiscal/v1/documents')
@UseGuards(ApiKeyGuard)
@UseFilters(FiscalExceptionFilter)
@UseInterceptors(IdempotencyInterceptor)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  /** Asynchronous: 202 with the queued document. Poll `GET /documents/:id` for the DIAN verdict. */
  @Post()
  @HttpCode(202)
  @Idempotent()
  @RequireScopes('documents:write')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  create(@FiscalContext() ctx: FiscalRequestContext, @Body() dto: CreateDocumentDto) {
    return this.documents.create(ctx.issuerId, dto);
  }

  @Get()
  @RequireScopes('documents:read')
  list(@FiscalContext() ctx: FiscalRequestContext, @Query() q: DocumentListQueryDto) {
    return this.documents.list(ctx.issuerId, q);
  }

  @Get(':id')
  @RequireScopes('documents:read')
  get(@FiscalContext() ctx: FiscalRequestContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.get(ctx.issuerId, id);
  }

  /** PDF as the provider renders it. VERIFY: no XML download exists on the provider side. */
  @Get(':id/pdf')
  @RequireScopes('documents:read')
  @Header('Content-Type', 'application/pdf')
  async pdf(@FiscalContext() ctx: FiscalRequestContext, @Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const { filename, data } = await this.documents.pdf(ctx.issuerId, id);
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`);
    return new StreamableFile(data);
  }
}
