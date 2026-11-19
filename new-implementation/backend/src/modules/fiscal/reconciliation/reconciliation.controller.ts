import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { FiscalExceptionFilter } from '../common/fiscal-exception.filter';
import { ReconciliationService } from './reconciliation.service';

/** Staff-facing fiscal endpoints (POS JWT): reconciliation for admins/managers, per-sale status for any cashier. */
@ApiTags('fiscal-v1')
@ApiBearerAuth('access-token')
@Controller('fiscal/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(FiscalExceptionFilter)
export class ReconciliationController {
  constructor(private readonly reconciliation: ReconciliationService) {}

  @Get('admin/reconciliation')
  @Roles('admin', 'manager', 'superadmin')
  problems(@CurrentUser() user: User, @Query('limit') limit?: string) {
    return this.reconciliation.problems(user.company_id, Math.min(Math.max(Number(limit) || 100, 1), 200));
  }

  @Post('admin/reconciliation/:id/requeue')
  @Roles('admin', 'manager', 'superadmin')
  @HttpCode(204)
  requeue(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliation.requeue(user.company_id, id);
  }

  /** Fiscal status of one sale, for the receipt. */
  @Get('sales/:orderId/status')
  forSale(@CurrentUser() user: User, @Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.reconciliation.forSale(user.company_id, orderId);
  }
}
