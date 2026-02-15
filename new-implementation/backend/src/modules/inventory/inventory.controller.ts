import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StockService } from './services/stock.service';
import { WarehouseService } from './services/warehouse.service';
import { MovementService } from './services/movement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { MovementQueryDto } from './dto/movement-query.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { User } from '../auth/entities/user.entity';

interface CurrentUserWithCompany extends User {
  company_id: string;
}

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private readonly stockService: StockService,
    private readonly warehouseService: WarehouseService,
    private readonly movementService: MovementService,
  ) {}

  // Stock endpoints
  @Get('stock')
  @Roles('inventory_manager', 'manager', 'admin')
  async getStock(@CurrentUser() user: CurrentUserWithCompany) {
    return this.stockService.getCurrentStock(user);
  }

  @Get('stock/:product_id')
  @Roles('inventory_manager', 'manager', 'admin')
  async getStockByProduct(
    @Param('product_id', new ParseUUIDPipe()) productId: string,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.stockService.getStockByProduct(productId, user);
  }

  @Post('adjust')
  @Roles('inventory_manager', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.stockService.adjustStock(dto, user);
  }

  // Movement endpoints
  @Get('movements')
  @Roles('inventory_manager', 'manager', 'admin')
  async listMovements(
    @Query() query: MovementQueryDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.movementService.listMovements(query, user);
  }

  @Get('movements/:id')
  @Roles('inventory_manager', 'manager', 'admin')
  async getMovement(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.movementService.getMovementById(id, user);
  }

  // Warehouse endpoints
  @Get('warehouses')
  @Roles('inventory_manager', 'manager', 'admin')
  async listWarehouses(@CurrentUser() user: CurrentUserWithCompany) {
    return this.warehouseService.listWarehouses(user);
  }

  @Post('warehouses')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async createWarehouse(
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.warehouseService.createWarehouse(dto, user);
  }

  @Get('warehouses/:id')
  @Roles('inventory_manager', 'manager', 'admin')
  async getWarehouse(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.warehouseService.getWarehouseById(id, user);
  }

  @Put('warehouses/:id')
  @Roles('admin', 'manager')
  async updateWarehouse(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Partial<CreateWarehouseDto>,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.warehouseService.updateWarehouse(id, dto, user);
  }

  // Location endpoints
  @Post('locations')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async createLocation(
    @Body() dto: CreateLocationDto,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.warehouseService.createLocation(dto, user);
  }

  @Put('locations/:id')
  @Roles('admin', 'manager')
  async updateLocation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Partial<CreateLocationDto>,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.warehouseService.updateLocation(id, dto, user);
  }

  @Get('locations/:warehouse_id')
  @Roles('inventory_manager', 'manager', 'admin')
  async listLocations(
    @Param('warehouse_id', new ParseUUIDPipe()) warehouseId: string,
    @CurrentUser() user: CurrentUserWithCompany,
  ) {
    return this.warehouseService.listLocations(warehouseId, user);
  }
}
