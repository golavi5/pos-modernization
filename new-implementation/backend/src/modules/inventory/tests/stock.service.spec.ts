import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockService } from '../services/stock.service';
import { MovementType, StockMovement } from '../entities/stock-movement.entity';
import { Product } from '../../products/entities/product.entity';
import type { AdjustStockDto } from '../dto/adjust-stock.dto';

// SPEC-BACK-007: stock lives in `products.stock_quantity`; every adjustment
// writes exactly one movement in the same transaction.
describe('StockService', () => {
  const user = { id: 'u1', company_id: 'c1' } as never;
  let product: Partial<Product> | null;
  let manager: Record<'findOne' | 'save' | 'create', jest.Mock>;
  let productRepo: { createQueryBuilder: jest.Mock; findOne: jest.Mock };
  let service: StockService;

  const adjust = (movement_type: MovementType, quantity: number): AdjustStockDto => ({
    product_id: 'p1',
    movement_type,
    quantity,
  });

  beforeEach(() => {
    product = { id: 'p1', name: 'Café', sku: 'CAF', stock_quantity: 5, reorder_level: 2 };
    manager = {
      findOne: jest.fn(async () => product),
      save: jest.fn(async (_e: unknown, o: unknown) => o),
      create: jest.fn((_e: unknown, o: unknown) => o),
    };
    productRepo = { createQueryBuilder: jest.fn(), findOne: jest.fn() };
    service = new StockService(
      productRepo as never,
      { transaction: (cb: (m: typeof manager) => unknown) => cb(manager) } as never,
      { ensureDefaultLocation: jest.fn(async () => 'loc1') } as never,
    );
  });

  describe('adjustStock', () => {
    it.each([
      [MovementType.IN, 3, 8],
      [MovementType.RETURN, 3, 8],
      [MovementType.OUT, 3, 2],
      [MovementType.ADJUST, 3, 2],
      [MovementType.DAMAGE, 3, 2],
    ])('%s of %i leaves stock at %i and journals one movement', async (type, qty, expected) => {
      const movement = await service.adjustStock(adjust(type, qty), user);

      expect(product!.stock_quantity).toBe(expected);
      expect(movement).toMatchObject({
        movement_type: type,
        quantity: qty,
        product_id: 'p1',
        location_id: 'loc1',
        company_id: 'c1',
        created_by: 'u1',
      });
      expect(manager.save).toHaveBeenCalledWith(StockMovement, expect.anything());
    });

    it('rejects a manual decrement that would cross zero and writes nothing', async () => {
      await expect(
        service.adjustStock(adjust(MovementType.OUT, 6), user),
      ).rejects.toThrow(BadRequestException);
      expect(product!.stock_quantity).toBe(5);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('allows an exact decrement to zero', async () => {
      await service.adjustStock(adjust(MovementType.DAMAGE, 5), user);
      expect(product!.stock_quantity).toBe(0);
    });

    it('rejects any decrement on an already-negative (oversold) product', async () => {
      product!.stock_quantity = -2;
      await expect(
        service.adjustStock(adjust(MovementType.ADJUST, 1), user),
      ).rejects.toThrow(BadRequestException);
    });

    it('lets an IN lift an oversold product back toward zero', async () => {
      product!.stock_quantity = -2;
      await service.adjustStock(adjust(MovementType.IN, 1), user);
      expect(product!.stock_quantity).toBe(-1);
    });

    it('throws NotFound for an unknown (or other-company) product', async () => {
      product = null;
      await expect(
        service.adjustStock(adjust(MovementType.IN, 1), user),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStockByProduct', () => {
    it('maps the product to a stock level', async () => {
      productRepo.findOne.mockResolvedValue(product);
      await expect(service.getStockByProduct('p1', user)).resolves.toEqual({
        id: 'p1',
        product_id: 'p1',
        product_name: 'Café',
        product_sku: 'CAF',
        quantity: 5,
        reorder_level: 2,
      });
    });

    it('throws NotFound when the product is not in the company', async () => {
      productRepo.findOne.mockResolvedValue(null);
      await expect(service.getStockByProduct('p1', user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCurrentStock', () => {
    it('pages products and filters by search and low stock', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[product], 1]),
      };
      productRepo.createQueryBuilder.mockReturnValue(qb);

      const page = await service.getCurrentStock(
        { page: 2, pageSize: 10, search: 'caf', low_stock: true },
        user,
      );

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(qb.andWhere).toHaveBeenCalledTimes(2);
      expect(page).toMatchObject({ total: 1, page: 2, pageSize: 10 });
      expect(page.data[0]).toMatchObject({ product_id: 'p1', quantity: 5 });
    });
  });
});
