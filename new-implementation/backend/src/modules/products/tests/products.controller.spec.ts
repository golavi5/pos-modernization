import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from '../products.controller';
import { ProductsService, ProductWithOversell } from '../products.service';
import { User } from '../../auth/entities/user.entity';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;
  let mockUser: User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            findOneForApi: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
    
    mockUser = {
      id: 'user-uuid',
      company_id: 'company-uuid',
    } as User;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const query = { offset: 0, limit: 10 };
      const expectedResult = {
        data: [] as ProductWithOversell[],
        meta: { total: 0, offset: 0, limit: 10, hasMore: false },
      };
      
      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);
      
      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser, query);
    });
  });

  describe('findOne', () => {
    it('should return a product', async () => {
      const productId = 'test-id';
      const expectedProduct = {
        id: productId,
        name: 'Test Product',
        company_id: mockUser.company_id,
        sku: 'TEST001',
        price: 10,
        stock_quantity: 5,
        is_active: true,
        can_sell_without_stock: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as ProductWithOversell;

      jest.spyOn(service, 'findOneForApi').mockResolvedValue(expectedProduct);

      const result = await controller.findOne(productId, mockUser);

      expect(result).toEqual(expectedProduct);
      expect(service.findOneForApi).toHaveBeenCalledWith(productId, mockUser);
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
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

      const expectedProduct = {
        id: 'new-product-id',
        ...createProductDto,
        can_sell_without_stock: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as ProductWithOversell;

      jest.spyOn(service, 'create').mockResolvedValue(expectedProduct);

      const result = await controller.create(createProductDto, mockUser);
      
      expect(result).toEqual(expectedProduct);
      expect(service.create).toHaveBeenCalledWith(createProductDto, mockUser);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const productId = 'test-id';
      const updateProductDto = {
        name: 'Updated Product Name',
        price: 15,
      };
      
      const expectedProduct = {
        id: productId,
        name: 'Updated Product Name',
        sku: 'TEST001',
        price: 15,
        stock_quantity: 5,
        reorder_level: 2,
        tax_rate: 19,
        company_id: mockUser.company_id,
        can_sell_without_stock: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as ProductWithOversell;

      jest.spyOn(service, 'update').mockResolvedValue(expectedProduct);

      const result = await controller.update(productId, updateProductDto, mockUser);
      
      expect(result).toEqual(expectedProduct);
      expect(service.update).toHaveBeenCalledWith(productId, updateProductDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should remove a product', async () => {
      const productId = 'test-id';
      
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      await controller.remove(productId, mockUser);
      
      expect(service.remove).toHaveBeenCalledWith(productId, mockUser);
    });
  });
});