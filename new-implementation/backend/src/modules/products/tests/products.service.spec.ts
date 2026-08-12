import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products.service';
import { Product } from '../entities/product.entity';
import { User } from '../../auth/entities/user.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SettingsService } from '../../settings/services/settings.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: Repository<Product>;
  let settingsService: SettingsService;
  let mockUser: User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useClass: Repository,
        },
        {
          provide: SettingsService,
          useValue: { getSettings: jest.fn(async () => ({ allowNegativeStock: false })) },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
    settingsService = module.get<SettingsService>(SettingsService);

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

      const result = await service.findAll(mockUser, { offset: 0, limit: 10, is_active: true, sort: 'created_at', order: 'DESC' } as any);

      expect(result.data).toEqual(mockProducts.map((p) => ({ ...p, can_sell_without_stock: false })));
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
    beforeEach(() => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockImplementation((d: any) => d as any);
      jest.spyOn(repository, 'save').mockImplementation(async (p: any) => p);
    });

    const dto = () => ({
      name: 'Café',
      sku: 'PRD-001',
      price: 1000,
      stock_quantity: 5,
      tax_rate: 19,
    }) as any;

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

      expect(result).toEqual({ ...savedProduct, can_sell_without_stock: false });
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

    it('creates the product under the JWT company_id even if the body carries a different one', async () => {
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

      // Uses the beforeEach's pass-through find/create/save: no SKU conflict,
      // and the persisted shape is whatever the service handed the repository.
      const result = await service.create(createProductDto, mockUser);

      expect(result.company_id).toBe(mockUser.company_id);
      expect(result.company_id).not.toBe('different-company-id');
    });

    it('toma company_id y created_by del usuario del JWT', async () => {
      const created = await service.create(dto(), mockUser);

      expect(created.company_id).toBe('company-uuid');
      expect(created.created_by).toBe('user-uuid');
    });

    it('un company_id ajeno en el body no crea producto en esa empresa', async () => {
      // Escenario: el ValidationPipe no descartó el campo (pipe mal configurado,
      // o una llamada interna que se salta el pipe). El servicio no debe fiarse.
      const hostile = { ...dto(), company_id: 'otra-empresa' };

      const created = await service.create(hostile, mockUser);

      expect(created.company_id).toBe('company-uuid');
      expect(created.company_id).not.toBe('otra-empresa');
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

      expect(result).toEqual({ ...updatedProduct, can_sell_without_stock: false });
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

  describe('can_sell_without_stock en las respuestas', () => {
    it('findAll resuelve la bandera de cada producto contra el global', async () => {
      jest.spyOn(settingsService, 'getSettings')
        .mockResolvedValue({ allowNegativeStock: true } as any);
      const products = [
        { id: '1', allow_sale_without_stock: null },
        { id: '2', allow_sale_without_stock: false },
        { id: '3', allow_sale_without_stock: true },
      ] as any[];
      jest.spyOn(repository, 'findAndCount').mockResolvedValue([products, 3]);

      const result = await service.findAll(mockUser, {
        offset: 0, limit: 10, sort: 'created_at', order: 'DESC',
      } as any);

      expect(result.data.map((p: any) => p.can_sell_without_stock)).toEqual([true, false, true]);
      // getSettings crea y persiste la fila si la empresa no tiene ninguna: una
      // resolución por producto convertiría GET /products en N upserts.
      expect(settingsService.getSettings).toHaveBeenCalledTimes(1);
    });

    it('findOneForApi resuelve la bandera igual que findAll, incluso cuando el producto la anula (272 legados)', async () => {
      jest.spyOn(settingsService, 'getSettings')
        .mockResolvedValue({ allowNegativeStock: true } as any);
      const entity = { id: '1', company_id: 'company-uuid', allow_sale_without_stock: false } as any;
      jest.spyOn(repository, 'findOne').mockResolvedValue(entity);

      const result = await service.findOneForApi('1', mockUser);

      expect(result.can_sell_without_stock).toBe(false);
    });

    it('findOne sigue devolviendo la entidad, sin el campo resuelto', async () => {
      // Lo usan deductStock y SalesService.createOrder, que hacen save() con lo
      // que devuelve: no puede llevar propiedades que no son columna.
      const entity = { id: '1', company_id: 'company-uuid', allow_sale_without_stock: null } as any;
      jest.spyOn(repository, 'findOne').mockResolvedValue(entity);

      const found = await service.findOne('1', mockUser);

      expect(found).toBe(entity);
      expect('can_sell_without_stock' in found).toBe(false);
    });

    it('getOversellPolicy lee el ajuste de la empresa', async () => {
      jest.spyOn(settingsService, 'getSettings')
        .mockResolvedValue({ allowNegativeStock: true } as any);

      await expect(service.getOversellPolicy('company-uuid'))
        .resolves.toEqual({ allowNegativeStock: true });
    });
  });
});