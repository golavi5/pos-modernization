import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { StockService } from './services/stock.service';
import { WarehouseService } from './services/warehouse.service';
import { MovementService } from './services/movement.service';
import { StockCalculatorService } from './services/stock-calculator.service';
import { ReorderAlertService } from './services/reorder-alert.service';
import { Warehouse } from './entities/warehouse.entity';
import { WarehouseLocation } from './entities/warehouse-location.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse, WarehouseLocation, StockMovement]),
    AuthModule,
  ],
  controllers: [InventoryController],
  providers: [
    StockService,
    WarehouseService,
    MovementService,
    StockCalculatorService,
    ReorderAlertService,
  ],
  exports: [StockService, WarehouseService, MovementService],
})
export class InventoryModule {}
