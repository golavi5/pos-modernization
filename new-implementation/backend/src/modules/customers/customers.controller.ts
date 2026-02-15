import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { UpdateLoyaltyPointsDto } from './dto/loyalty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * POST /customers
   * Create a new customer
   */
  @Post()
  @Roles('admin', 'manager', 'cashier')
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: any,
  ) {
    return this.customersService.create(createCustomerDto, user.company_id);
  }

  /**
   * GET /customers
   * Get all customers with pagination and filters
   */
  @Get()
  @Roles('admin', 'manager', 'cashier', 'viewer')
  async findAll(@Query() query: CustomerQueryDto, @CurrentUser() user: any) {
    return this.customersService.findAll(query, user.company_id);
  }

  /**
   * GET /customers/stats
   * Get customer statistics
   * NOTE: This route must come BEFORE /:id to avoid conflicts
   */
  @Get('stats')
  @Roles('admin', 'manager')
  async getStats(@CurrentUser() user: any) {
    return this.customersService.getStats(user.company_id);
  }

  /**
   * GET /customers/top
   * Get top customers by total purchases
   */
  @Get('top')
  @Roles('admin', 'manager')
  async getTopCustomers(
    @Query('limit') limit: string = '10',
    @CurrentUser() user: any,
  ) {
    const limitNum = parseInt(limit, 10) || 10;
    return this.customersService.getTopCustomers(user.company_id, limitNum);
  }

  /**
   * GET /customers/search
   * Advanced customer search
   */
  @Get('search')
  @Roles('admin', 'manager', 'cashier')
  async advancedSearch(
    @Query() query: CustomerQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.customersService.advancedSearch(query, user.company_id);
  }

  /**
   * GET /customers/:id
   * Get a single customer by ID
   */
  @Get(':id')
  @Roles('admin', 'manager', 'cashier', 'viewer')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.customersService.findOne(id, user.company_id);
  }

  /**
   * GET /customers/:id/purchase-history
   * Get customer purchase history
   */
  @Get(':id/purchase-history')
  @Roles('admin', 'manager', 'cashier')
  async getPurchaseHistory(
    @Param('id') id: string,
    @Query('limit') limit: string = '10',
    @CurrentUser() user: any,
  ) {
    const limitNum = parseInt(limit, 10) || 10;
    return this.customersService.getPurchaseHistory(
      id,
      user.company_id,
      limitNum,
    );
  }

  /**
   * PATCH /customers/:id
   * Update a customer
   */
  @Patch(':id')
  @Roles('admin', 'manager')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: any,
  ) {
    return this.customersService.update(id, updateCustomerDto, user.company_id);
  }

  /**
   * PATCH /customers/:id/loyalty
   * Update customer loyalty points
   */
  @Patch(':id/loyalty')
  @Roles('admin', 'manager')
  async updateLoyalty(
    @Param('id') id: string,
    @Body() updateLoyaltyDto: UpdateLoyaltyPointsDto,
    @CurrentUser() user: any,
  ) {
    return this.customersService.updateLoyaltyPoints(
      id,
      updateLoyaltyDto,
      user.company_id,
    );
  }

  /**
   * DELETE /customers/:id
   * Soft delete a customer (sets is_active = false)
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.customersService.remove(id, user.company_id);
  }
}
