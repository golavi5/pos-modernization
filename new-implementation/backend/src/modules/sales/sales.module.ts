import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesController } from './sales.controller';
import { PaymentsController } from './payments.controller';
import { SalesService } from './services/sales.service';
import { PaymentsService } from './services/payments.service';
import { OrderCalculationService } from './services/order-calculation.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from './entities/payment.entity';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Payment]),
    AuthModule,
    ProductsModule,
  ],
  controllers: [SalesController, PaymentsController],
  providers: [SalesService, PaymentsService, OrderCalculationService],
  exports: [SalesService, PaymentsService, OrderCalculationService],
})
export class SalesModule {}