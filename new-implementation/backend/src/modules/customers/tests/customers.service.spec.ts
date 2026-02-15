import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomersService } from '../customers.service';
import { Customer } from '../customer.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { UpdateLoyaltyPointsDto } from '../dto/loyalty.dto';

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: Repository<Customer>;

  const mockCompanyId = 'company-123';
  const mockCustomer: Customer = {
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

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    repository = module.get<Repository<Customer>>(getRepositoryToken(Customer));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new customer successfully', async () => {
      const createDto: CreateCustomerDto = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+9876543210',
        address: '456 Oak Ave',
      };

      mockRepository.findOne.mockResolvedValue(null); // No existing customer
      mockRepository.create.mockReturnValue({ ...createDto, company_id: mockCompanyId });
      mockRepository.save.mockResolvedValue({
        id: 'new-customer-id',
        ...createDto,
        company_id: mockCompanyId,
        loyalty_points: 0,
        total_purchases: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.create(createDto, mockCompanyId);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.email).toBe(createDto.email);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(2); // Email and phone checks
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      const createDto: CreateCustomerDto = {
        name: 'Duplicate User',
        email: 'john@example.com',
      };

      mockRepository.findOne.mockResolvedValueOnce(mockCustomer); // Email exists

      await expect(service.create(createDto, mockCompanyId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if phone already exists', async () => {
      const createDto: CreateCustomerDto = {
        name: 'Duplicate Phone',
        phone: '+1234567890',
      };

      mockRepository.findOne
        .mockResolvedValueOnce(null) // Email check passes
        .mockResolvedValueOnce(mockCustomer); // Phone exists

      await expect(service.create(createDto, mockCompanyId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a customer by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockCustomer);

      const result = await service.findOne('customer-1', mockCompanyId);

      expect(result).toBeDefined();
      expect(result.id).toBe('customer-1');
      expect(result.name).toBe('John Doe');
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockCompanyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a customer successfully', async () => {
      const updateDto: UpdateCustomerDto = {
        name: 'John Updated',
        address: '789 New St',
      };

      mockRepository.findOne.mockResolvedValue(mockCustomer);
      mockRepository.save.mockResolvedValue({
        ...mockCustomer,
        ...updateDto,
      });

      const result = await service.update('customer-1', updateDto, mockCompanyId);

      expect(result.name).toBe('John Updated');
      expect(result.address).toBe('789 New St');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', {}, mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check email uniqueness when updating', async () => {
      const updateDto: UpdateCustomerDto = {
        email: 'newemail@example.com',
      };

      mockRepository.findOne
        .mockResolvedValueOnce(mockCustomer) // Find customer
        .mockResolvedValueOnce({ id: 'other-customer', email: 'newemail@example.com' }); // Email taken

      await expect(
        service.update('customer-1', updateDto, mockCompanyId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a customer', async () => {
      mockRepository.findOne.mockResolvedValue(mockCustomer);
      mockRepository.save.mockResolvedValue({
        ...mockCustomer,
        is_active: false,
      });

      await service.remove('customer-1', mockCompanyId);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent', mockCompanyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateLoyaltyPoints', () => {
    it('should add loyalty points', async () => {
      const updateDto: UpdateLoyaltyPointsDto = {
        points: 50,
        operation: 'add',
      };

      mockRepository.findOne.mockResolvedValue(mockCustomer);
      mockRepository.save.mockResolvedValue({
        ...mockCustomer,
        loyalty_points: 150,
      });

      const result = await service.updateLoyaltyPoints(
        'customer-1',
        updateDto,
        mockCompanyId,
      );

      expect(result.loyalty_points).toBe(150);
    });

    it('should subtract loyalty points', async () => {
      const updateDto: UpdateLoyaltyPointsDto = {
        points: 30,
        operation: 'subtract',
      };

      mockRepository.findOne.mockResolvedValue(mockCustomer);
      mockRepository.save.mockResolvedValue({
        ...mockCustomer,
        loyalty_points: 70,
      });

      const result = await service.updateLoyaltyPoints(
        'customer-1',
        updateDto,
        mockCompanyId,
      );

      expect(result.loyalty_points).toBe(70);
    });

    it('should throw BadRequestException if insufficient points for subtraction', async () => {
      const updateDto: UpdateLoyaltyPointsDto = {
        points: 200,
        operation: 'subtract',
      };

      mockRepository.findOne.mockResolvedValue(mockCustomer);

      await expect(
        service.updateLoyaltyPoints('customer-1', updateDto, mockCompanyId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set loyalty points to exact value', async () => {
      const updateDto: UpdateLoyaltyPointsDto = {
        points: 500,
        operation: 'set',
      };

      mockRepository.findOne.mockResolvedValue(mockCustomer);
      mockRepository.save.mockResolvedValue({
        ...mockCustomer,
        loyalty_points: 500,
      });

      const result = await service.updateLoyaltyPoints(
        'customer-1',
        updateDto,
        mockCompanyId,
      );

      expect(result.loyalty_points).toBe(500);
    });
  });

  describe('getTopCustomers', () => {
    it('should return top customers by total purchases', async () => {
      const topCustomers = [
        { ...mockCustomer, total_purchases: 1000 },
        { ...mockCustomer, id: 'customer-2', total_purchases: 800 },
        { ...mockCustomer, id: 'customer-3', total_purchases: 600 },
      ];

      mockRepository.find.mockResolvedValue(topCustomers);

      const result = await service.getTopCustomers(mockCompanyId, 10);

      expect(result).toHaveLength(3);
      expect(result[0].total_purchases).toBe(1000);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { company_id: mockCompanyId, is_active: true },
        order: { total_purchases: 'DESC' },
        take: 10,
      });
    });
  });

  describe('getStats', () => {
    it('should return customer statistics', async () => {
      const customers = [
        mockCustomer,
        { ...mockCustomer, id: 'customer-2', is_active: false },
        {
          ...mockCustomer,
          id: 'customer-3',
          loyalty_points: 200,
          total_purchases: 1000,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([customers, 3]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getStats(mockCompanyId);

      expect(result.totalCustomers).toBe(3);
      expect(result.activeCustomers).toBe(2);
      expect(result.inactiveCustomers).toBe(1);
      expect(result.totalLoyaltyPoints).toBeGreaterThan(0);
    });
  });

  describe('getPurchaseHistory', () => {
    it('should return empty array (placeholder until sales integration)', async () => {
      mockRepository.findOne.mockResolvedValue(mockCustomer);

      const result = await service.getPurchaseHistory('customer-1', mockCompanyId, 10);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getPurchaseHistory('non-existent', mockCompanyId, 10),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePurchaseStats', () => {
    it('should update customer purchase stats', async () => {
      mockRepository.findOne.mockResolvedValue(mockCustomer);
      mockRepository.save.mockResolvedValue({
        ...mockCustomer,
        total_purchases: 700,
        last_purchase_date: expect.any(Date),
      });

      await service.updatePurchaseStats('customer-1', mockCompanyId, 200);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_purchases: 700,
          last_purchase_date: expect.any(Date),
        }),
      );
    });

    it('should silently fail if customer not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePurchaseStats('non-existent', mockCompanyId, 100),
      ).resolves.not.toThrow();
    });
  });
});
