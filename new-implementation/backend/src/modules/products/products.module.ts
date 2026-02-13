import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductCategory]),
  ],
  controllers: [
    ProductsController,
    ProductCategoriesController,
  ],
  providers: [
    ProductsService,
    ProductCategoriesService,
  ],
  exports: [
    ProductsService,
    ProductCategoriesService,
  ],
})
export class ProductsModule {}