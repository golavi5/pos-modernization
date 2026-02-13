import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { User } from '../../auth/entities/user.entity';
import { NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: Repository<Product>;
  let mockUser: User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
    
    mockUser = {
      id: 'user-uuid',
      company_id: 'company-uuid',
      // Add other required properties based on your User entity
    } as User;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated products for the user\'s company', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          company_id: mockUser.company_id,
          sku: 'SKU001',
          price: 10,
          stock_quantity: 5,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        } as Product,
      ];
      
      jest.spyOn(repository, 'findAndCount').mockResolvedValue([mockProducts, 1]);

      const result = await service.findAll(mockUser, { offset: 0, limit: 10 });
      
      expect(result.data).toEqual(mockProducts);
      expect(result.meta.total).toBe(1);
      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { company_id: mockUser.company_id, is_active: true },
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a product if found', async () => {
      const productId = 'test-id';
      const mockProduct = {
        id: productId,
        name: 'Test Product',
        company_id: mockUser.company_id,
        sku: 'TEST001',
        price: 10,
        stock_quantity: 5,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as Product;
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockProduct);

      const result = await service.findOne(productId, mockUser);
      
      expect(result).toEqual(mockProduct);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: productId, company_id: mockUser.company_id },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      const productId = 'non-existent-id';
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(undefined);

      await expect(service.findOne(productId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new product successfully', async () => {
      const createProductDto = {
        name: 'New Product',
        sku: 'NEW001',
        price: 10,
        stock_quantity: 5,
        reorder_level: 2,
        tax_rate: 19,
        company_id: mockUser.company_id,
        created_by: mockUser.id,
      };

      const savedProduct = {
        id: 'new-product-id',
        ...createProductDto,
        created_at: new Date(),
        updated_at: new Date(),
      } as Product;
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(undefined); // No existing product with same SKU
      jest.spyOn(repository, 'create').mockReturnValue(savedProduct);
      jest.spyOn(repository, 'save').mockResolvedValue(savedProduct);

      const result = await service.create(createProductDto, mockUser);
      
      expect(result).toEqual(savedProduct);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { sku: createProductDto.sku, company_id: mockUser.company_id },
      });
    });

    it('should throw ConflictException if SKU already exists', async () => {
      const createProductDto = {
        name: 'New Product',
        sku: 'EXISTING001',
        price: 10,
        stock_quantity: 5,
        reorder_level: 2,
        tax_rate: 19,
        company_id: mockUser.company_id,
        created_by: mockUser.id,
      };

      const existingProduct = {
        id: 'existing-id',
        ...createProductDto,
        created_at: new Date(),
        updated_at: new Date(),
      } as Product;
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(existingProduct);

      await expect(service.create(createProductDto, mockUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw UnauthorizedException if company_id mismatch', async () => {
      const createProductDto = {
        name: 'New Product',
        sku: 'NEW001',
        price: 10,
        stock_quantity: 5,
        reorder_level: 2,
        tax_rate: 19,
        company_id: 'different-company-id',
        created_by: mockUser.id,
      };
      
      await expect(service.create(createProductDto, mockUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const productId = 'test-id';
      const updateProductDto = {
        name: 'Updated Product Name',
        price: 15,
      };
      
      const existingProduct = {
        id: productId,
        name: 'Original Product',
        sku: 'ORIG001',
        price: 10,
        stock_quantity: 5,
        reorder_level: 2,
        tax_rate: 19,
        company_id: mockUser.company_id,
        created_at: new Date(),
        updated_at: new Date(),
      } as Product;
      
      const updatedProduct = {
        ...existingProduct,
        ...updateProductDto,
        updated_at: new Date(),
      } as Product;
      
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(existingProduct);
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(undefined); // No conflict with SKU
      jest.spyOn(repository, 'save').mockResolvedValue(updatedProduct);

      const result = await service.update(productId, updateProductDto, mockUser);
      
      expect(result).toEqual(updatedProduct);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: productId, company_id: mockUser.company_id },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      const productId = 'non-existent-id';
      const updateProductDto = { name: 'Updated Name' };
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(undefined);

      await expect(
        service.update(productId, updateProductDto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a product successfully', async () => {
      const productId = 'test-id';
      const existingProduct = {
        id: productId,
        name: 'Test Product',
        sku: 'TEST001',
        price: 10,
        stock_quantity: 5,
        reorder_level: 2,
        tax_rate: 19,
        company_id: mockUser.company_id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as Product;
      
      const deletedProduct = {
        ...existingProduct,
        is_active: false,
        deleted_at: new Date(),
      } as Product;
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(existingProduct);
      jest.spyOn(repository, 'save').mockResolvedValue(deletedProduct);

      await service.remove(productId, mockUser);
      
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: productId, company_id: mockUser.company_id },
      });
      expect(deletedProduct.is_active).toBe(false);
      expect(deletedProduct.deleted_at).toBeDefined();
    });

    it('should throw NotFoundException if product not found', async () => {
      const productId = 'non-existent-id';
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(undefined);

      await expect(service.remove(productId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});