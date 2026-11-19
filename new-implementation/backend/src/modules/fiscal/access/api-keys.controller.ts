import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { FiscalExceptionFilter } from '../common/fiscal-exception.filter';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

/**
 * Key management for the signed-in tenant admin (POS JWT, not an app key).
 * `@Roles` goes on each handler: `RolesGuard` reads handler metadata only, so a
 * class-level `@Roles` is silently ignored.
 */
@ApiTags('fiscal-v1')
@ApiBearerAuth('access-token')
@Controller('fiscal/v1/admin/api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(FiscalExceptionFilter)
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Post()
  @Roles('admin', 'superadmin')
  create(@CurrentUser() user: User, @Body() dto: CreateApiKeyDto) {
    return this.keys.create(user.company_id, dto.name, dto.scopes);
  }

  @Get()
  @Roles('admin', 'superadmin')
  list(@CurrentUser() user: User) {
    return this.keys.list(user.company_id);
  }

  @Delete(':id')
  @Roles('admin', 'superadmin')
  @HttpCode(204)
  async revoke(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    if (!(await this.keys.revoke(user.company_id, id))) throw new NotFoundException('API key not found');
  }
}
