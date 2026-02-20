import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAll(user: User, query: ProductQueryDto) {
    const { offset = 0, limit = 10, search, category_id, sort, order, is_active } = query;
    
    const where: FindOptionsWhere<Product> = {
      company_id: user.company_id,
    };
    
    if (category_id) {
      where.category_id = category_id;
    }
    
    if (is_active !== undefined) {
      where.is_active = is_active;
    }
    
    if (search) {
      where.name = ILike(`%${search}%`);
    }

    const [products, total] = await this.productRepository.findAndCount({
      where,
      skip: offset,
      take: limit,
      order: { [sort]: order },
    });

    return {
      data: products,
      meta: {
        total,
        offset,
        limit,
        hasMore: total > offset + limit,
      },
    };
  }

  async findOne(id: string, user: User) {
    const product = await this.productRepository.findOne({
      where: { id, company_id: user.company_id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(createProductDto: CreateProductDto, user: User) {
    // Check if SKU already exists for this company
    const existingProductBySku = await this.productRepository.findOne({
      where: { sku: createProductDto.sku, company_id: user.company_id },
    });
    
    if (existingProductBySku) {
      throw new ConflictException(`Product with SKU ${createProductDto.sku} already exists`);
    }
    
    // Check if barcode already exists for this company (if provided)
    if (createProductDto.barcode) {
      const existingProductByBarcode = await this.productRepository.findOne({
        where: { barcode: createProductDto.barcode, company_id: user.company_id },
      });
      
      if (existingProductByBarcode) {
        throw new ConflictException(`Product with barcode ${createProductDto.barcode} already exists`);
      }
    }
    
    // Ensure the company_id in the DTO matches the user's company_id
    if (createProductDto.company_id !== user.company_id) {
      throw new UnauthorizedException('Cannot create product for another company');
    }
    
    const product = this.productRepository.create({
      ...createProductDto,
      created_by: user.id,
    });
    
    return await this.productRepository.save(product);
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const product = await this.productRepository.findOne({
      where: { id, company_id: user.company_id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check if SKU is being updated and if it already exists for this company
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.findOne({
        where: { sku: updateProductDto.sku, company_id: user.company_id },
      });
      
      if (existingProduct) {
        throw new ConflictException(`Product with SKU ${updateProductDto.sku} already exists`);
      }
    }
    
    // Check if barcode is being updated and if it already exists for this company
    if (updateProductDto.barcode && updateProductDto.barcode !== product.barcode) {
      const existingProduct = await this.productRepository.findOne({
        where: { barcode: updateProductDto.barcode, company_id: user.company_id },
      });
      
      if (existingProduct) {
        throw new ConflictException(`Product with barcode ${updateProductDto.barcode} already exists`);
      }
    }

    Object.assign(product, updateProductDto);
    return await this.productRepository.save(product);
  }

  async remove(id: string, user: User) {
    const product = await this.productRepository.findOne({
      where: { id, company_id: user.company_id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Perform soft delete
    product.deleted_at = new Date();
    product.is_active = false;
    return await this.productRepository.save(product);
  }
  
  async checkReorderLevels(user: User) {
    const lowStockProducts = await this.productRepository
      .createQueryBuilder('product')
      .where('product.company_id = :companyId', { companyId: user.company_id })
      .andWhere('product.stock_quantity <= product.reorder_level')
      .andWhere('product.is_active = :isActive', { isActive: true })
      .getMany();

    return lowStockProducts;
  }

  async deductStock(productId: string, quantity: number, user: User): Promise<Product> {
    const product = await this.findOne(productId, user);

    if (product.stock_quantity < quantity) {
      throw new BadRequestException(
        `Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${quantity}`,
      );
    }

    product.stock_quantity -= quantity;
    return await this.productRepository.save(product);
  }

  async addStock(productId: string, quantity: number, user: User): Promise<Product> {
    const product = await this.findOne(productId, user);
    product.stock_quantity += quantity;
    return await this.productRepository.save(product);
  }
}