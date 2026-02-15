import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockService } from '../services/stock.service';
import { StockCalculatorService } from '../services/stock-calculator.service';
import { WarehouseLocation } from '../entities/warehouse-location.entity';
import { StockMovement, MovementType } from '../entities/stock-movement.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('StockService', () => {
  let service: StockService;
  let locationRepository: Repository<WarehouseLocation>;
  let movementRepository: Repository<StockMovement>;
  let stockCalculator: StockCalculatorService;

  const mockUser = {
    id: 'user-123',
    company_id: 'company-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        StockCalculatorService,
        {
          provide: getRepositoryToken(WarehouseLocation),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
    locationRepository = module.get<Repository<WarehouseLocation>>(
      getRepositoryToken(WarehouseLocation),
    );
    movementRepository = module.get<Repository<StockMovement>>(
      getRepositoryToken(StockMovement),
    );
    stockCalculator = module.get<StockCalculatorService>(StockCalculatorService);
  });

  describe('getCurrentStock', () => {
    it('should return current stock levels for all locations', async () => {
      const mockLocations = [
        {
          id: 'loc-1',
          location_code: 'A1',
          current_stock: 50,
          capacity: 100,
        },
        {
          id: 'loc-2',
          location_code: 'A2',
          current_stock: 30,
          capacity: 100,
        },
      ];

      jest
        .spyOn(locationRepository, 'find')
        .mockResolvedValue(mockLocations as any);

      const result = await service.getCurrentStock(mockUser as any);

      expect(result).toHaveLength(2);
      expect(result[0].location_code).toBe('A1');
      expect(result[0].current_stock).toBe(50);
    });
  });

  describe('adjustStock', () => {
    it('should increase stock on IN movement', async () => {
      const mockLocation = {
        id: 'loc-1',
        company_id: 'company-1',
        current_stock: 50,
        capacity: 100,
      };

      jest
        .spyOn(locationRepository, 'findOne')
        .mockResolvedValue(mockLocation as any);
      jest
        .spyOn(movementRepository, 'create')
        .mockReturnValue({ id: 'move-1' } as any);
      jest
        .spyOn(movementRepository, 'save')
        .mockResolvedValue({ id: 'move-1' } as any);
      jest.spyOn(locationRepository, 'save').mockResolvedValue(mockLocation as any);

      const dto = {
        product_id: 'prod-1',
        location_id: 'loc-1',
        movement_type: MovementType.IN,
        quantity: 20,
      };

      await service.adjustStock(dto, mockUser as any);

      expect(movementRepository.create).toHaveBeenCalled();
      expect(locationRepository.save).toHaveBeenCalled();
      expect(mockLocation.current_stock).toBe(70);
    });

    it('should decrease stock on OUT movement', async () => {
      const mockLocation = {
        id: 'loc-1',
        company_id: 'company-1',
        current_stock: 50,
        capacity: 100,
      };

      jest
        .spyOn(locationRepository, 'findOne')
        .mockResolvedValue(mockLocation as any);
      jest
        .spyOn(movementRepository, 'create')
        .mockReturnValue({ id: 'move-1' } as any);
      jest
        .spyOn(movementRepository, 'save')
        .mockResolvedValue({ id: 'move-1' } as any);
      jest.spyOn(locationRepository, 'save').mockResolvedValue(mockLocation as any);

      const dto = {
        product_id: 'prod-1',
        location_id: 'loc-1',
        movement_type: MovementType.OUT,
        quantity: 20,
      };

      await service.adjustStock(dto, mockUser as any);

      expect(mockLocation.current_stock).toBe(30);
    });

    it('should throw error on insufficient stock', async () => {
      const mockLocation = {
        id: 'loc-1',
        company_id: 'company-1',
        current_stock: 10,
        capacity: 100,
      };

      jest
        .spyOn(locationRepository, 'findOne')
        .mockResolvedValue(mockLocation as any);

      const dto = {
        product_id: 'prod-1',
        location_id: 'loc-1',
        movement_type: MovementType.OUT,
        quantity: 20,
      };

      await expect(service.adjustStock(dto, mockUser as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when location not found', async () => {
      jest.spyOn(locationRepository, 'findOne').mockResolvedValue(null);

      const dto = {
        product_id: 'prod-1',
        location_id: 'invalid-loc',
        movement_type: MovementType.IN,
        quantity: 10,
      };

      await expect(service.adjustStock(dto, mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error when exceeding capacity', async () => {
      const mockLocation = {
        id: 'loc-1',
        company_id: 'company-1',
        current_stock: 90,
        capacity: 100,
      };

      jest
        .spyOn(locationRepository, 'findOne')
        .mockResolvedValue(mockLocation as any);

      const dto = {
        product_id: 'prod-1',
        location_id: 'loc-1',
        movement_type: MovementType.IN,
        quantity: 20,
      };

      await expect(service.adjustStock(dto, mockUser as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should only return locations for user company', async () => {
      jest.spyOn(locationRepository, 'find').mockResolvedValue([]);

      await service.getCurrentStock(mockUser as any);

      expect(locationRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: mockUser.company_id,
          }),
        }),
      );
    });
  });
});
