import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './services/payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { User } from '../auth/entities/user.entity';

interface CurrentUserWithCompany extends User {
  company_id: number;
}

@Controller('sales/orders/:orderId/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('cashier', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async recordPayment(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ): Promise<Payment> {
    return this.paymentsService.recordPayment(orderId, dto, user);
  }

  @Get()
  @Roles('cashier', 'manager', 'admin')
  async getPayments(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() user: CurrentUserWithCompany,
  ): Promise<Payment[]> {
    return this.paymentsService.getPaymentsByOrderId(orderId, user);
  }

  @Get('summary')
  @Roles('cashier', 'manager', 'admin')
  async getPaymentSummary(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.paymentsService.getPaymentSummary(orderId, user);
  }
}
