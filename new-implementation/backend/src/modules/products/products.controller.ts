import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() user: User,
    @Query() query: ProductQueryDto,
  ): Promise<{ data: ProductResponseDto[]; meta: any }> {
    return await this.productsService.findAll(user, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    return await this.productsService.findOne(id, user);
  }

  @Post()
  @Roles('manager', 'inventory_manager')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    return await this.productsService.create(createProductDto, user);
  }

  @Put(':id')
  @Roles('manager', 'inventory_manager')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    return await this.productsService.update(id, updateProductDto, user);
  }

  @Delete(':id')
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.productsService.remove(id, user);
  }
}