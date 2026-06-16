import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './customer.entity';
import { Order } from '../sales/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Order])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService], // Export for use in other modules (e.g., sales)
})
export class CustomersModule {}
