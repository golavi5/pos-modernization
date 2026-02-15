import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from '../customers.controller';
import { CustomersService } from '../customers.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { UpdateLoyaltyPointsDto } from '../dto/loyalty.dto';
import { CustomerQueryDto } from '../dto/customer-query.dto';
import { CustomerResponseDto } from '../dto/customer-response.dto';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: CustomersService;

  const mockCompanyId = 'company-123';
  const mockUser = {
    id: 'user-1',
    company_id: mockCompanyId,
    role: 'admin',
  };

  const mockCustomerResponse: CustomerResponseDto = {
    id: 'customer-1',
    company_id: mockCompanyId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    loyalty_points: 100,
    total_purchases: 500,
    last_purchase_date: new Date('2026-02-10'),
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-02-01'),
  };

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getPurchaseHistory: jest.fn(),
    updateLoyaltyPoints: jest.fn(),
    getTopCustomers: jest.fn(),
    getStats: jest.fn(),
    advancedSearch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new customer', async () => {
      const createDto: CreateCustomerDto = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+9876543210',
      };

      mockService.create.mockResolvedValue(mockCustomerResponse);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockCustomerResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, mockCompanyId);
    });
  });

  describe('findAll', () => {
    it('should return paginated customers', async () => {
      const query: CustomerQueryDto = {
        page: 1,
        pageSize: 20,
      };

      const paginatedResponse = {
        data: [mockCustomerResponse],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      mockService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(query, mockUser);

      expect(result).toEqual(paginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query, mockCompanyId);
    });

    it('should handle search queries', async () => {
      const query: CustomerQueryDto = {
        search: 'john',
        page: 1,
        pageSize: 20,
      };

      mockService.findAll.mockResolvedValue({
        data: [mockCustomerResponse],
        total: 1,
        page: 1,
        pageSize: 20,
      });

      await controller.findAll(query, mockUser);

      expect(service.findAll).toHaveBeenCalledWith(query, mockCompanyId);
    });
  });

  describe('findOne', () => {
    it('should return a single customer', async () => {
      mockService.findOne.mockResolvedValue(mockCustomerResponse);

      const result = await controller.findOne('customer-1', mockUser);

      expect(result).toEqual(mockCustomerResponse);
      expect(service.findOne).toHaveBeenCalledWith('customer-1', mockCompanyId);
    });
  });

  describe('update', () => {
    it('should update a customer', async () => {
      const updateDto: UpdateCustomerDto = {
        name: 'John Updated',
        address: '456 New St',
      };

      const updatedCustomer = {
        ...mockCustomerResponse,
        ...updateDto,
      };

      mockService.update.mockResolvedValue(updatedCustomer);

      const result = await controller.update('customer-1', updateDto, mockUser);

      expect(result).toEqual(updatedCustomer);
      expect(service.update).toHaveBeenCalledWith(
        'customer-1',
        updateDto,
        mockCompanyId,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a customer', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('customer-1', mockUser);

      expect(service.remove).toHaveBeenCalledWith('customer-1', mockCompanyId);
    });
  });

  describe('getPurchaseHistory', () => {
    it('should return customer purchase history', async () => {
      const mockHistory = [
        { id: 'order-1', total: 100, date: new Date() },
        { id: 'order-2', total: 200, date: new Date() },
      ];

      mockService.getPurchaseHistory.mockResolvedValue(mockHistory);

      const result = await controller.getPurchaseHistory('customer-1', '10', mockUser);

      expect(result).toEqual(mockHistory);
      expect(service.getPurchaseHistory).toHaveBeenCalledWith(
        'customer-1',
        mockCompanyId,
        10,
      );
    });

    it('should use default limit if not provided', async () => {
      mockService.getPurchaseHistory.mockResolvedValue([]);

      await controller.getPurchaseHistory('customer-1', undefined, mockUser);

      expect(service.getPurchaseHistory).toHaveBeenCalledWith(
        'customer-1',
        mockCompanyId,
        10,
      );
    });
  });

  describe('updateLoyalty', () => {
    it('should add loyalty points', async () => {
      const updateDto: UpdateLoyaltyPointsDto = {
        points: 50,
        operation: 'add',
      };

      const updatedCustomer = {
        ...mockCustomerResponse,
        loyalty_points: 150,
      };

      mockService.updateLoyaltyPoints.mockResolvedValue(updatedCustomer);

      const result = await controller.updateLoyalty('customer-1', updateDto, mockUser);

      expect(result).toEqual(updatedCustomer);
      expect(service.updateLoyaltyPoints).toHaveBeenCalledWith(
        'customer-1',
        updateDto,
        mockCompanyId,
      );
    });

    it('should subtract loyalty points', async () => {
      const updateDto: UpdateLoyaltyPointsDto = {
        points: 30,
        operation: 'subtract',
      };

      const updatedCustomer = {
        ...mockCustomerResponse,
        loyalty_points: 70,
      };

      mockService.updateLoyaltyPoints.mockResolvedValue(updatedCustomer);

      const result = await controller.updateLoyalty('customer-1', updateDto, mockUser);

      expect(result.loyalty_points).toBe(70);
    });
  });

  describe('getTopCustomers', () => {
    it('should return top customers', async () => {
      const topCustomers = [
        { ...mockCustomerResponse, total_purchases: 1000 },
        { ...mockCustomerResponse, id: 'customer-2', total_purchases: 800 },
      ];

      mockService.getTopCustomers.mockResolvedValue(topCustomers);

      const result = await controller.getTopCustomers('10', mockUser);

      expect(result).toEqual(topCustomers);
      expect(service.getTopCustomers).toHaveBeenCalledWith(mockCompanyId, 10);
    });

    it('should use default limit', async () => {
      mockService.getTopCustomers.mockResolvedValue([]);

      await controller.getTopCustomers(undefined, mockUser);

      expect(service.getTopCustomers).toHaveBeenCalledWith(mockCompanyId, 10);
    });
  });

  describe('getStats', () => {
    it('should return customer statistics', async () => {
      const stats = {
        totalCustomers: 100,
        activeCustomers: 85,
        inactiveCustomers: 15,
        totalLoyaltyPoints: 5000,
        avgPurchaseValue: 250,
        recentCustomers: 30,
      };

      mockService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats(mockUser);

      expect(result).toEqual(stats);
      expect(service.getStats).toHaveBeenCalledWith(mockCompanyId);
    });
  });

  describe('advancedSearch', () => {
    it('should perform advanced search', async () => {
      const query: CustomerQueryDto = {
        search: 'john',
        isActive: true,
        minLoyaltyPoints: 50,
      };

      mockService.advancedSearch.mockResolvedValue([mockCustomerResponse]);

      const result = await controller.advancedSearch(query, mockUser);

      expect(result).toEqual([mockCustomerResponse]);
      expect(service.advancedSearch).toHaveBeenCalledWith(query, mockCompanyId);
    });
  });
});
