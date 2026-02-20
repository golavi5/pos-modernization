import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { SalesReportService } from './services/sales-report.service';
import { ProductReportService } from './services/product-report.service';
import { InventoryReportService } from './services/inventory-report.service';
import { CustomerReportService } from './services/customer-report.service';
import { ExportService } from './services/export.service';

// Import entities from other modules
import { Order } from '../sales/entities/order.entity';
import { OrderItem } from '../sales/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/customer.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      Customer,
      StockMovement,
      Warehouse,
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    SalesReportService,
    ProductReportService,
    InventoryReportService,
    CustomerReportService,
    ExportService,
  ],
  exports: [
    SalesReportService,
    ProductReportService,
    InventoryReportService,
    CustomerReportService,
    ExportService,
  ],
})
export class ReportsModule {}
