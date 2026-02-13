import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@Controller('products/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductCategoriesController {
  constructor(
    private readonly categoriesService: ProductCategoriesService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@CurrentUser() user: User): Promise<CategoryResponseDto[]> {
    return await this.categoriesService.findAll(user.company_id);
  }

  @Post()
  @Roles('manager')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() user: User,
  ): Promise<CategoryResponseDto> {
    return await this.categoriesService.create(createCategoryDto, user);
  }

  @Put(':id')
  @Roles('manager')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CategoryResponseDto>,
    @CurrentUser() user: User,
  ): Promise<CategoryResponseDto> {
    return await this.categoriesService.update(id, updateData, user);
  }
}