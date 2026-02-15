import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomersService } from '../customers.service';
import { Customer } from '../customer.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: Repository<Customer>;

  const mockUser = {
    id: 'user-123',
    company_id: 'company-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    repository = module.get<Repository<Customer>>(getRepositoryToken(Customer));
  });

  describe('listCustomers', () => {
    it('should return paginated customers', async () => {
      const mockCustomers = [
        { id: '1', name: 'Customer 1', email: 'customer1@test.com' },
      ];

      jest
        .spyOn(repository, 'findAndCount')
        .mockResolvedValue([mockCustomers as any, 1]);

      const result = await service.listCustomers({ page: 1, limit: 10 }, mockUser as any);

      expect(result.customers).toEqual(mockCustomers);
      expect(result.total).toBe(1);
    });

    it('should filter by company_id', async () => {
      jest.spyOn(repository, 'findAndCount').mockResolvedValue([[], 0]);

      await service.listCustomers({}, mockUser as any);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: mockUser.company_id,
          }),
        }),
      );
    });
  });

  describe('getCustomerById', () => {
    it('should return customer if found', async () => {
      const mockCustomer = {
        id: '1',
        name: 'Test Customer',
        company_id: mockUser.company_id,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockCustomer as any);

      const result = await service.getCustomerById('1', mockUser as any);

      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.getCustomerById('invalid', mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createCustomer', () => {
    it('should create a new customer', async () => {
      const dto = {
        name: 'New Customer',
        email: 'new@test.com',
        phone: '1234567890',
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue({ ...dto } as any);
      jest.spyOn(repository, 'save').mockResolvedValue({ id: '1', ...dto } as any);

      const result = await service.createCustomer(dto, mockUser as any);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(dto.name);
    });

    it('should throw ConflictException if email exists', async () => {
      const dto = { name: 'Test', email: 'existing@test.com' };

      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue({ email: dto.email } as any);

      await expect(service.createCustomer(dto, mockUser as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateCustomer', () => {
    it('should update customer', async () => {
      const mockCustomer = {
        id: '1',
        name: 'Old Name',
        email: 'old@test.com',
        company_id: mockUser.company_id,
      };

      const dto = { name: 'New Name' };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockCustomer as any);
      jest
        .spyOn(repository, 'save')
        .mockResolvedValue({ ...mockCustomer, ...dto } as any);

      const result = await service.updateCustomer('1', dto, mockUser as any);

      expect(result.name).toBe('New Name');
    });

    it('should check email uniqueness when updating email', async () => {
      const mockCustomer = {
        id: '1',
        email: 'old@test.com',
        company_id: mockUser.company_id,
      };

      const dto = { email: 'existing@test.com' };

      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(mockCustomer as any)
        .mockResolvedValueOnce({ email: dto.email } as any);

      await expect(
        service.updateCustomer('1', dto, mockUser as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteCustomer', () => {
    it('should soft delete customer', async () => {
      const mockCustomer = {
        id: '1',
        name: 'Test',
        company_id: mockUser.company_id,
        is_active: true,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockCustomer as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockCustomer as any);

      const result = await service.deleteCustomer('1', mockUser as any);

      expect(result.message).toContain('deleted successfully');
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('addLoyaltyPoints', () => {
    it('should add points to customer', async () => {
      const mockCustomer = {
        id: '1',
        loyalty_points: 100,
        company_id: mockUser.company_id,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockCustomer as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockCustomer as any);

      await service.addLoyaltyPoints('1', 50, mockUser as any);

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should only return customers for user company', async () => {
      jest.spyOn(repository, 'findAndCount').mockResolvedValue([[], 0]);

      await service.listCustomers({}, mockUser as any);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: mockUser.company_id,
          }),
        }),
      );
    });
  });
});
