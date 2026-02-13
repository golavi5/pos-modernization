import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { User } from '../../auth/entities/user.entity'; // Assuming user entity exists

@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private categoryRepository: Repository<ProductCategory>,
  ) {}

  async findAll(company_id: string) {
    const categories = await this.categoryRepository.find({
      where: { company_id },
      order: { name: 'ASC' },
    });

    return categories;
  }

  async findOne(id: string, company_id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id, company_id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async create(createCategoryDto: CreateCategoryDto, user: User) {
    // Ensure the company_id in the DTO matches the user's company_id
    if (createCategoryDto.company_id !== user.company_id) {
      throw new UnauthorizedException('Cannot create category for another company');
    }
    
    // Check if parent category exists if provided
    if (createCategoryDto.parent_id) {
      const parentCategory = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parent_id, company_id: user.company_id },
      });
      
      if (!parentCategory) {
        throw new NotFoundException(`Parent category with ID ${createCategoryDto.parent_id} not found`);
      }
    }
    
    const category = this.categoryRepository.create({
      ...createCategoryDto,
      company_id: user.company_id,
    });
    
    return await this.categoryRepository.save(category);
  }

  async update(id: string, updateData: Partial<ProductCategory>, user: User) {
    const category = await this.categoryRepository.findOne({
      where: { id, company_id: user.company_id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if trying to set parent to itself
    if (updateData.parent_id && updateData.parent_id === id) {
      throw new BadRequestException('Category cannot be a parent of itself');
    }

    // Check if parent category exists if provided
    if (updateData.parent_id) {
      const parentCategory = await this.categoryRepository.findOne({
        where: { id: updateData.parent_id, company_id: user.company_id },
      });
      
      if (!parentCategory) {
        throw new NotFoundException(`Parent category with ID ${updateData.parent_id} not found`);
      }
    }

    Object.assign(category, updateData);
    return await this.categoryRepository.save(category);
  }
}