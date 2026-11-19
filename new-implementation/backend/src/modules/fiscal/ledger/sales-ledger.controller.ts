import { Controller, Get, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard, RequireScopes } from '../access/api-key.guard';
import { FiscalContext } from '../access/fiscal-context.decorator';
import { FiscalRequestContext } from '../access/scopes';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { FiscalExceptionFilter } from '../common/fiscal-exception.filter';
import { SalesLedgerQueryDto, SalesLedgerService } from './sales-ledger.service';

/** Sales book for other apps (API key, scope `ledger:read`). */
@ApiTags('fiscal-v1')
@ApiBearerAuth('fiscal-api-key')
@Controller('fiscal/v1/ledger/sales')
@UseGuards(ApiKeyGuard)
@UseFilters(FiscalExceptionFilter)
export class SalesLedgerController {
  constructor(private readonly ledger: SalesLedgerService) {}

  @Get()
  @RequireScopes('ledger:read')
  list(@FiscalContext() ctx: FiscalRequestContext, @Query() q: SalesLedgerQueryDto) {
    return this.ledger.list(ctx.issuerId, q);
  }
}

/** Sales book for staff (POS JWT). `@Roles` per handler: RolesGuard ignores class-level metadata. */
@ApiTags('fiscal-v1')
@ApiBearerAuth('access-token')
@Controller('fiscal/v1/admin/ledger/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(FiscalExceptionFilter)
export class SalesLedgerStaffController {
  constructor(private readonly ledger: SalesLedgerService) {}

  @Get()
  @Roles('admin', 'manager', 'accountant', 'superadmin')
  list(@CurrentUser() user: User, @Query() q: SalesLedgerQueryDto) {
    return this.ledger.list(user.company_id, q);
  }
}
