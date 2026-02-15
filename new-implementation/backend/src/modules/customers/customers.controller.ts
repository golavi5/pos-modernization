import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { AddLoyaltyPointsDto } from './dto/loyalty.dto';
import { User } from '../auth/entities/user.entity';

interface CurrentUserWithCompany extends User {
  company_id: string;
}

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles('cashier', 'manager', 'admin')
  async listCustomers(
    @Query() query: CustomerQueryDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.customersService.listCustomers(query, user);
  }

  @Get('search')
  @Roles('cashier', 'manager', 'admin')
  async searchCustomers(
    @Query('q') searchTerm: string,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.customersService.searchCustomers(searchTerm, user);
  }

  @Get('top')
  @Roles('manager', 'admin')
  async getTopCustomers(
    @Query('limit') limit: number,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.customersService.getTopCustomers(limit || 10, user);
  }

  @Get(':id')
  @Roles('cashier', 'manager', 'admin')
  async getCustomer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.customersService.getCustomerById(id, user);
  }

  @Post()
  @Roles('cashier', 'manager', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createCustomer(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.customersService.createCustomer(dto, user);
  }

  @Put(':id')
  @Roles('cashier', 'manager', 'admin')
  async updateCustomer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.customersService.updateCustomer(id, dto, user);
  }

  @Delete(':id')
  @Roles('manager', 'admin')
  async deleteCustomer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.customersService.deleteCustomer(id, user);
  }

  @Post(':id/loyalty')
  @Roles('cashier', 'manager', 'admin')
  async addLoyaltyPoints(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddLoyaltyPointsDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.customersService.addLoyaltyPoints(id, dto.points, user);
  }
}
