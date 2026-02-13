import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SalesService } from './services/sales.service';
import { OrderCalculationService } from './services/order-calculation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { Order } from './entities/order.entity';
import { User } from '../auth/entities/user.entity';
import { SalesSummaryDto } from './dto/sales-summary.dto';

interface CurrentUserWithCompany extends User {
  company_id: number;
}

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly calculationService: OrderCalculationService,
  ) {}

  @Get('orders')
  @Roles('cashier', 'manager', 'admin')
  async listOrders(
    @Query() query: OrderQueryDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.salesService.listOrders(query, user);
  }

  @Get('orders/:id')
  @Roles('cashier', 'manager', 'admin')
  async getOrderById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserWithCompany,
  ): Promise<Order> {
    return this.salesService.getOrderById(id, user);
  }

  @Post('orders')
  @Roles('cashier', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ): Promise<Order> {
    return this.salesService.createOrder(dto, user);
  }

  @Put('orders/:id')
  @Roles('manager')
  async updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ): Promise<Order> {
    return this.salesService.updateOrder(id, dto, user);
  }

  @Patch('orders/:id/status')
  @Roles('cashier', 'manager')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ): Promise<Order> {
    return this.salesService.updateOrderStatus(id, dto, user);
  }

  @Delete('orders/:id')
  @Roles('manager')
  @HttpCode(HttpStatus.OK)
  async deleteOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.salesService.deleteOrder(id, user);
  }

  @Get('orders/:id/payments')
  @Roles('cashier', 'manager', 'admin')
  async getOrderPayments(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.salesService.getOrderPayments(id, user);
  }

  @Get('reports/daily')
  @Roles('manager', 'admin')
  async getDailySalesReport(
    @CurrentUser() user: CurrentUserWithCompany,
    @Query('date') date?: string,
  ): Promise<SalesSummaryDto> {
    const reportDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { orders } = await this.salesService.listOrders(
      {
        page: 1,
        limit: 1000,
        startDate: startOfDay,
        endDate: endOfDay,
      },
      user,
    );

    return this.generateSalesSummary(orders, startOfDay, endOfDay);
  }

  @Get('reports/summary')
  @Roles('manager', 'admin')
  async getSalesSummary(
    @CurrentUser() user: CurrentUserWithCompany,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SalesSummaryDto> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const { orders } = await this.salesService.listOrders(
      {
        page: 1,
        limit: 1000,
        startDate: start,
        endDate: end,
      },
      user,
    );

    return this.generateSalesSummary(orders, start, end);
  }

  private generateSalesSummary(orders: Order[], startDate: Date, endDate: Date): SalesSummaryDto {
    const completedOrders = orders.filter(o => o.status === 'completed');

    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_amount, 0);
    const totalDiscount = completedOrders.reduce((sum, order) => sum + order.discount_amount, 0);
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    return {
      total_orders: completedOrders.length,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_discount: Math.round(totalDiscount * 100) / 100,
      average_order_value: Math.round(averageOrderValue * 100) / 100,
      date_range: {
        start_date: startDate,
        end_date: endDate,
      },
    };
  }
}
