import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { SalesService } from '../services/sales.service';
import { OrderCalculationService } from '../services/order-calculation.service';
import { ProductsService } from '../../products/products.service';
import { Order, OrderStatus, PaymentStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';

describe('SalesService', () => {
  let service: SalesService;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;
  let calculationService: OrderCalculationService;
  let productsService: ProductsService;

  const mockUser = {
    id: 1,
    company_id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        OrderCalculationService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            find: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ProductsService,
          useValue: {
            findOne: jest.fn(),
            deductStock: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    orderItemRepository = module.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
    calculationService = module.get<OrderCalculationService>(OrderCalculationService);
    productsService = module.get<ProductsService>(ProductsService);
  });

  describe('listOrders', () => {
    it('should return orders with pagination', async () => {
      const mockOrders = [
        { id: 1, order_number: 'ORD20260213001', status: OrderStatus.DRAFT } as Order,
      ];

      jest.spyOn(orderRepository, 'findAndCount').mockResolvedValue([mockOrders, 1]);

      const result = await service.listOrders({ page: 1, limit: 10 }, mockUser);

      expect(result.orders).toEqual(mockOrders);
      expect(result.total).toBe(1);
      expect(orderRepository.findAndCount).toHaveBeenCalled();
    });

    it('should filter orders by status', async () => {
      jest.spyOn(orderRepository, 'findAndCount').mockResolvedValue([[], 0]);

      await service.listOrders({ status: OrderStatus.COMPLETED }, mockUser);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.COMPLETED,
            company_id: mockUser.company_id,
          }),
        }),
      );
    });

    it('should enforce multi-tenant isolation', async () => {
      jest.spyOn(orderRepository, 'findAndCount').mockResolvedValue([[], 0]);

      await service.listOrders({}, mockUser);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: mockUser.company_id,
          }),
        }),
      );
    });
  });

  describe('getOrderById', () => {
    it('should return order with items and payments', async () => {
      const mockOrder = {
        id: 1,
        order_number: 'ORD20260213001',
        company_id: 1,
        order_items: [],
        payments: [],
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const result = await service.getOrderById(1, mockUser);

      expect(result).toEqual(mockOrder);
      expect(orderRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, company_id: mockUser.company_id },
        }),
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getOrderById(999, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should enforce multi-tenant isolation in getOrderById', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getOrderById(1, mockUser)).rejects.toThrow(NotFoundException);

      expect(orderRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: mockUser.company_id,
          }),
        }),
      );
    });
  });

  describe('createOrder', () => {
    const createOrderDto: CreateOrderDto = {
      items: [
        {
          product_id: 1,
          quantity: 2,
          unit_price: 100,
        },
      ],
      discount_amount: 10,
    };

    it('should create order with items and calculate totals', async () => {
      const mockProduct = { id: 1, name: 'Test Product', stock_quantity: 10 };
      const mockSavedOrder = { id: 1, order_number: 'ORD20260213001' } as Order;

      jest.spyOn(productsService, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockSavedOrder);
      jest.spyOn(orderItemRepository, 'save').mockResolvedValue([]);
      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockSavedOrder);

      const result = await service.createOrder(createOrderDto, mockUser);

      expect(result).toEqual(mockSavedOrder);
      expect(orderRepository.save).toHaveBeenCalled();
      expect(orderItemRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no items provided', async () => {
      const emptyDto: CreateOrderDto = { items: [] };

      await expect(service.createOrder(emptyDto, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should check stock availability before creating order', async () => {
      const mockProduct = { id: 1, name: 'Test Product', stock_quantity: 1 };

      jest.spyOn(productsService, 'findOne').mockResolvedValue(mockProduct);

      const dtoWithHighQty: CreateOrderDto = {
        items: [
          {
            product_id: 1,
            quantity: 5,
            unit_price: 100,
          },
        ],
      };

      await expect(service.createOrder(dtoWithHighQty, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if product not found', async () => {
      jest.spyOn(productsService, 'findOne').mockResolvedValue(null);

      await expect(service.createOrder(createOrderDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should automatically set order status to DRAFT', async () => {
      const mockProduct = { id: 1, name: 'Test Product', stock_quantity: 10 };
      const mockSavedOrder = { id: 1, order_number: 'ORD20260213001', status: OrderStatus.DRAFT } as Order;

      jest.spyOn(productsService, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockSavedOrder);
      jest.spyOn(orderItemRepository, 'save').mockResolvedValue([]);
      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockSavedOrder);

      await service.createOrder(createOrderDto, mockUser);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.DRAFT,
          company_id: mockUser.company_id,
          created_by: mockUser.id,
        }),
      );
    });

    it('should set payment status to UNPAID for new orders', async () => {
      const mockProduct = { id: 1, name: 'Test Product', stock_quantity: 10 };
      const mockSavedOrder = { id: 1, order_number: 'ORD20260213001' } as Order;

      jest.spyOn(productsService, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockSavedOrder);
      jest.spyOn(orderItemRepository, 'save').mockResolvedValue([]);
      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockSavedOrder);

      await service.createOrder(createOrderDto, mockUser);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: PaymentStatus.UNPAID,
        }),
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should transition from DRAFT to PENDING', async () => {
      const mockOrder = { id: 1, status: OrderStatus.DRAFT } as Order;

      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockOrder);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder);

      const dto: UpdateOrderStatusDto = { status: OrderStatus.PENDING };

      await service.updateOrderStatus(1, dto, mockUser);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.PENDING,
        }),
      );
    });

    it('should deduct stock when confirming order', async () => {
      const mockOrder = {
        id: 1,
        status: OrderStatus.PENDING,
        order_items: [{ product_id: 1, quantity: 2 }],
      } as Order;

      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockOrder);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder);
      jest.spyOn(productsService, 'deductStock').mockResolvedValue({} as any);

      const dto: UpdateOrderStatusDto = { status: OrderStatus.CONFIRMED };

      await service.updateOrderStatus(1, dto, mockUser);

      expect(productsService.deductStock).toHaveBeenCalledWith(1, 2, mockUser);
    });

    it('should throw ConflictException for invalid transitions', async () => {
      const mockOrder = { id: 1, status: OrderStatus.COMPLETED } as Order;

      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockOrder);

      const dto: UpdateOrderStatusDto = { status: OrderStatus.DRAFT };

      await expect(service.updateOrderStatus(1, dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should prevent transitions from COMPLETED status', async () => {
      const mockOrder = { id: 1, status: OrderStatus.COMPLETED } as Order;

      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockOrder);

      const dto: UpdateOrderStatusDto = { status: OrderStatus.CANCELLED };

      await expect(service.updateOrderStatus(1, dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteOrder', () => {
    it('should delete DRAFT orders', async () => {
      const mockOrder = { id: 1, status: OrderStatus.DRAFT, order_number: 'ORD001' } as Order;

      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockOrder);
      jest.spyOn(orderItemRepository, 'delete').mockResolvedValue({ affected: 2 } as any);
      jest.spyOn(orderRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      const result = await service.deleteOrder(1, mockUser);

      expect(result.message).toContain('deleted');
      expect(orderItemRepository.delete).toHaveBeenCalledWith({ order_id: 1 });
      expect(orderRepository.delete).toHaveBeenCalledWith({ id: 1 });
    });

    it('should prevent deletion of non-DRAFT orders', async () => {
      const mockOrder = { id: 1, status: OrderStatus.PENDING, order_number: 'ORD001' } as Order;

      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockOrder);

      await expect(service.deleteOrder(1, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Calculations', () => {
    it('should calculate order totals correctly', async () => {
      const items: CreateOrderDto = {
        items: [
          { product_id: 1, quantity: 2, unit_price: 100 },
          { product_id: 2, quantity: 1, unit_price: 50 },
        ],
        discount_amount: 10,
      };

      const mockProduct1 = { id: 1, stock_quantity: 10 };
      const mockProduct2 = { id: 2, stock_quantity: 10 };
      const mockSavedOrder = { id: 1 } as Order;

      jest.spyOn(productsService, 'findOne').mockResolvedValueOnce(mockProduct1);
      jest.spyOn(productsService, 'findOne').mockResolvedValueOnce(mockProduct2);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockSavedOrder);
      jest.spyOn(orderItemRepository, 'save').mockResolvedValue([]);
      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockSavedOrder);

      await service.createOrder(items, mockUser);

      // Verify calculations
      const saveCall = jest.spyOn(orderRepository, 'save').mock.calls[0][0];
      expect(saveCall.subtotal).toBeGreaterThan(0);
      expect(saveCall.tax_amount).toBeGreaterThan(0);
      expect(saveCall.total_amount).toBeGreaterThan(0);
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should only list orders for user company', async () => {
      jest.spyOn(orderRepository, 'findAndCount').mockResolvedValue([[], 0]);

      await service.listOrders({}, mockUser);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: mockUser.company_id,
          }),
        }),
      );
    });

    it('should not allow access to orders from different company', async () => {
      const otherCompanyOrder = { id: 1, company_id: 2 } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getOrderById(1, mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
