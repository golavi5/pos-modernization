import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductCategory]),
    SettingsModule,
  ],
  controllers: [
    // Order matters: Nest registers routes in this order, and
    // `ProductsController` has `GET/PUT /products/:id`, which would capture
    // `/products/categories` if it came first. Static-prefix controller first.
    ProductCategoriesController,
    ProductsController,
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