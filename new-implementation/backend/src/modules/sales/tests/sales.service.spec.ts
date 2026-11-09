import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService } from '../services/sales.service';
import { OrderCalculationService } from '../services/order-calculation.service';
import { ProductsService } from '../../products/products.service';
import { Order, OrderStatus, PaymentStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { Product } from '../../products/entities/product.entity';
import { InventoryLocationsService } from '../../inventory/services/inventory-locations.service';
import { StockMovement, MovementType } from '../../inventory/entities/stock-movement.entity';

describe('SalesService', () => {
  let service: SalesService;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;
  // Resolved but unread: the module.get below asserts the provider is registered.
  let _calculationService: OrderCalculationService;
  let productsService: ProductsService;
  // Gestor falso de la transacción de `updateOrderStatus`.
  let manager: Record<'findOne' | 'find' | 'save' | 'create' | 'insert', jest.Mock>;
  let txOrder: Partial<Order>;
  let txProduct: Partial<Product>;
  let txItems: Partial<OrderItem>[];

  const mockUser = {
    id: 1,
    company_id: 1,
    email: 'test@example.com',
    name: 'Test User',
  } as any;

  beforeEach(async () => {
    txOrder = { id: 'o1', order_number: 'ORD1', company_id: 'c1', status: OrderStatus.PENDING };
    txProduct = { id: 'p1', name: 'Café', stock_quantity: 5, allow_sale_without_stock: false };
    txItems = [{ product_id: 'p1', quantity: 2 }];
    manager = {
      findOne: jest.fn(async (entity: unknown) => (entity === Order ? txOrder : txProduct)),
      find: jest.fn(async () => txItems),
      save: jest.fn(async (_e: unknown, o: unknown) => o),
      create: jest.fn((_e: unknown, o: unknown) => o),
      insert: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: DataSource, useValue: { transaction: (cb: (m: typeof manager) => unknown) => cb(manager) } },
        { provide: InventoryLocationsService, useValue: { ensureDefaultLocation: jest.fn(async () => 'loc1') } },
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
            getOversellPolicy: jest.fn(async () => ({ allowNegativeStock: false })),
          },
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    orderItemRepository = module.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
    _calculationService = module.get<OrderCalculationService>(OrderCalculationService);
    productsService = module.get<ProductsService>(ProductsService);
  });

  describe('listOrders', () => {
    it('should return orders with pagination', async () => {
      const mockOrders = [
        { id: 1, order_number: 'ORD20260213001', status: OrderStatus.DRAFT } as unknown as Order,
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
      } as unknown as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const result = await service.getOrderById(1 as any, mockUser);

      expect(result).toEqual(mockOrder);
      expect(orderRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, company_id: mockUser.company_id },
        }),
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getOrderById(999 as any, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should enforce multi-tenant isolation in getOrderById', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getOrderById(1 as any, mockUser)).rejects.toThrow(NotFoundException);

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
    const createOrderDto = {
      items: [
        {
          product_id: '1',
          quantity: 2,
          unit_price: 100,
        },
      ],
      discount_amount: 10,
    } as any as CreateOrderDto;

    it('should create order with items and calculate totals', async () => {
      const mockProduct = { id: '1', name: 'Test Product', stock_quantity: 10 } as unknown as Product;
      const mockSavedOrder = { id: 1, order_number: 'ORD20260213001' } as unknown as Order;

      jest.spyOn(productsService, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockSavedOrder);
      jest.spyOn(orderItemRepository, 'save').mockResolvedValue([] as any);
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
      const mockProduct = { id: '1', name: 'Test Product', stock_quantity: 1 } as unknown as Product;

      jest.spyOn(productsService, 'findOne').mockResolvedValue(mockProduct);

      const dtoWithHighQty = {
        items: [
          {
            product_id: '1',
            quantity: 5,
            unit_price: 100,
          },
        ],
      } as any as CreateOrderDto;

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
      const mockProduct = { id: '1', name: 'Test Product', stock_quantity: 10 } as unknown as Product;
      const mockSavedOrder = { id: 1, order_number: 'ORD20260213001', status: OrderStatus.DRAFT } as unknown as Order;

      jest.spyOn(productsService, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockSavedOrder);
      jest.spyOn(orderItemRepository, 'save').mockResolvedValue([] as any);
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
      const mockProduct = { id: '1', name: 'Test Product', stock_quantity: 10 } as unknown as Product;
      const mockSavedOrder = { id: 1, order_number: 'ORD20260213001' } as unknown as Order;

      jest.spyOn(productsService, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockSavedOrder);
      jest.spyOn(orderItemRepository, 'save').mockResolvedValue([] as any);
      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockSavedOrder);

      await service.createOrder(createOrderDto, mockUser);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: PaymentStatus.UNPAID,
        }),
      );
    });
  });

  describe('createOrder — venta sin existencias', () => {
    const dto = {
      items: [{ product_id: 'p1', quantity: 3, unit_price: 1000, tax_rate: 19 }],
    } as any;

    const productWith = (flag: boolean | null) => ({
      id: 'p1', name: 'Café', company_id: 1, stock_quantity: 0,
      price: 1000, tax_rate: 19, allow_sale_without_stock: flag,
    }) as any;

    beforeEach(() => {
      jest.spyOn(orderRepository, 'save').mockImplementation(async (o: any) => ({ ...o, id: 'o1' }));
      jest.spyOn(orderItemRepository, 'save').mockImplementation(async (i: any) => i);
      jest.spyOn(service, 'getOrderById').mockResolvedValue({ id: 'o1' } as any);
      jest.spyOn(orderRepository, 'findAndCount').mockResolvedValue([[], 0]);
    });

    it('rechaza si el producto no puede venderse sin existencias', async () => {
      jest.spyOn(productsService, 'findOne').mockResolvedValue(productWith(false));

      await expect(service.createOrder(dto, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('acepta si la bandera del producto lo permite, con el global apagado', async () => {
      jest.spyOn(productsService, 'findOne').mockResolvedValue(productWith(true));

      await expect(service.createOrder(dto, mockUser)).resolves.toBeDefined();
    });

    it('con la bandera en null, hereda del global encendido', async () => {
      jest.spyOn(productsService, 'findOne').mockResolvedValue(productWith(null));
      jest.spyOn(productsService, 'getOversellPolicy')
        .mockResolvedValue({ allowNegativeStock: true });

      await expect(service.createOrder(dto, mockUser)).resolves.toBeDefined();
    });

    it('un producto ya en negativo se puede vender si la bandera lo permite', async () => {
      // 7.809 productos del catálogo legado llegan con stock negativo.
      jest.spyOn(productsService, 'findOne')
        .mockResolvedValue({ ...productWith(true), stock_quantity: -4 });

      await expect(service.createOrder(dto, mockUser)).resolves.toBeDefined();
    });

    it('resuelve la política una sola vez, no por ítem', async () => {
      // dto propio con 3 ítems: si getOversellPolicy se moviera dentro del
      // bucle, esta aserción pasaría a fallar con 3 llamadas en vez de 1.
      // SettingsService.getSettings crea y persiste la fila de settings en
      // el primer acceso, así que resolverla por ítem convertiría un pedido
      // en N upserts.
      const multiItemDto = {
        items: [
          { product_id: 'p1', quantity: 3, unit_price: 1000, tax_rate: 19 },
          { product_id: 'p2', quantity: 1, unit_price: 500, tax_rate: 19 },
          { product_id: 'p3', quantity: 2, unit_price: 750, tax_rate: 19 },
        ],
      } as any;

      jest.spyOn(productsService, 'findOne').mockImplementation(async (id: string) =>
        ({ ...productWith(true), id, stock_quantity: 0 }) as any,
      );

      await expect(service.createOrder(multiItemDto, mockUser)).resolves.toBeDefined();
      expect(productsService.getOversellPolicy).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateOrderStatus', () => {
    const seen = (status: OrderStatus) =>
      jest.spyOn(service, 'getOrderById').mockResolvedValue({
        id: 'o1', order_number: 'ORD1', status,
      } as unknown as Order);
    const dto = (status: OrderStatus): UpdateOrderStatusDto => ({ status });

    it('should transition from DRAFT to PENDING', async () => {
      seen(OrderStatus.DRAFT);
      txOrder.status = OrderStatus.DRAFT;

      await service.updateOrderStatus('o1', dto(OrderStatus.PENDING), mockUser);

      expect(manager.save).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({ status: OrderStatus.PENDING }),
      );
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('confirming deducts the stock and writes an OUT movement for the order', async () => {
      seen(OrderStatus.PENDING);

      await service.updateOrderStatus('o1', dto(OrderStatus.CONFIRMED), mockUser);

      expect(txProduct.stock_quantity).toBe(3);
      expect(manager.insert).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({
          movement_type: MovementType.OUT,
          quantity: 2,
          reference_id: 'o1',
          location_id: 'loc1',
          notes: 'Venta ORD1',
        }),
      );
    });

    it('confirming rejects insufficient stock and writes nothing', async () => {
      seen(OrderStatus.PENDING);
      txProduct.stock_quantity = 1;

      await expect(
        service.updateOrderStatus('o1', dto(OrderStatus.CONFIRMED), mockUser),
      ).rejects.toThrow(BadRequestException);
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('confirming with the product flag oversells: stock goes negative, note says so', async () => {
      seen(OrderStatus.PENDING);
      txProduct.stock_quantity = 1;
      txProduct.allow_sale_without_stock = true;

      await service.updateOrderStatus('o1', dto(OrderStatus.CONFIRMED), mockUser);

      expect(txProduct.stock_quantity).toBe(-1);
      expect(manager.insert).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({ notes: 'Venta ORD1 (sin existencias)' }),
      );
    });

    it('confirming with the flag null inherits the global setting', async () => {
      seen(OrderStatus.PENDING);
      txProduct.stock_quantity = 1;
      txProduct.allow_sale_without_stock = null;
      jest.spyOn(productsService, 'getOversellPolicy').mockResolvedValue({ allowNegativeStock: true });

      await service.updateOrderStatus('o1', dto(OrderStatus.CONFIRMED), mockUser);

      expect(txProduct.stock_quantity).toBe(-1);
      expect(productsService.getOversellPolicy).toHaveBeenCalledTimes(1);
    });

    it('voiding a confirmed order returns the stock with a RETURN movement', async () => {
      seen(OrderStatus.CONFIRMED);
      txOrder.status = OrderStatus.CONFIRMED;
      txProduct.stock_quantity = 3;

      await service.updateOrderStatus('o1', dto(OrderStatus.VOIDED), mockUser);

      expect(txProduct.stock_quantity).toBe(5);
      expect(manager.insert).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({ movement_type: MovementType.RETURN, quantity: 2, reference_id: 'o1' }),
      );
    });

    it('rejects, under the lock, a transition that went stale after the first read', async () => {
      seen(OrderStatus.PENDING);
      txOrder.status = OrderStatus.CONFIRMED; // otro cajero lo confirmó entre medias

      await expect(
        service.updateOrderStatus('o1', dto(OrderStatus.CONFIRMED), mockUser),
      ).rejects.toThrow(/Cannot transition/);
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('should throw for invalid transitions', async () => {
      seen(OrderStatus.COMPLETED);

      await expect(
        service.updateOrderStatus('o1', dto(OrderStatus.DRAFT), mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent transitions from COMPLETED status', async () => {
      seen(OrderStatus.COMPLETED);

      await expect(
        service.updateOrderStatus('o1', dto(OrderStatus.CANCELLED), mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteOrder', () => {
    it('should delete DRAFT orders', async () => {
      const mockOrder = { id: 1, status: OrderStatus.DRAFT, order_number: 'ORD001' } as unknown as Order;

      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockOrder);
      jest.spyOn(orderItemRepository, 'delete').mockResolvedValue({ affected: 2 } as any);
      jest.spyOn(orderRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      const result = await service.deleteOrder(1 as any, mockUser);

      expect(result.message).toContain('deleted');
      expect(orderItemRepository.delete).toHaveBeenCalledWith({ order_id: 1 });
      expect(orderRepository.delete).toHaveBeenCalledWith({ id: 1 });
    });

    it('should prevent deletion of non-DRAFT orders', async () => {
      const mockOrder = { id: 1, status: OrderStatus.PENDING, order_number: 'ORD001' } as unknown as Order;

      jest.spyOn(service, 'getOrderById').mockResolvedValue(mockOrder);

      await expect(service.deleteOrder(1 as any, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Calculations', () => {
    it('should calculate order totals correctly', async () => {
      const items = {
        items: [
          { product_id: '1', quantity: 2, unit_price: 100 },
          { product_id: '2', quantity: 1, unit_price: 50 },
        ],
        discount_amount: 10,
      } as any as CreateOrderDto;

      const mockProduct1 = { id: '1', stock_quantity: 10 } as unknown as Product;
      const mockProduct2 = { id: '2', stock_quantity: 10 } as unknown as Product;
      const mockSavedOrder = { id: 1 } as unknown as Order;

      jest.spyOn(productsService, 'findOne').mockResolvedValueOnce(mockProduct1);
      jest.spyOn(productsService, 'findOne').mockResolvedValueOnce(mockProduct2);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockSavedOrder);
      jest.spyOn(orderItemRepository, 'save').mockResolvedValue([] as any);
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
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getOrderById(1 as any, mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
