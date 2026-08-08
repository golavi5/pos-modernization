import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationSchedulerService } from '../notification-scheduler.service';
import { NotificationsService } from '../notifications.service';
import {
  Notification,
  NotificationType,
} from '../../entities/notification.entity';
import { Product } from '../../../products/entities/product.entity';

describe('NotificationSchedulerService.checkLowStock', () => {
  let service: NotificationSchedulerService;
  let notificationsService: { create: jest.Mock };
  let notificationRepo: { find: jest.Mock };
  let productRepo: { find: jest.Mock };

  const companyId = 'company-A';
  const product = (over: Partial<Product>): Product =>
    ({
      id: 'p?',
      company_id: companyId,
      name: 'Item',
      sku: 'SKU',
      stock_quantity: 0,
      reorder_level: 5,
      is_active: true,
      ...over,
    }) as Product;

  beforeEach(async () => {
    notificationsService = { create: jest.fn().mockResolvedValue({}) };
    notificationRepo = { find: jest.fn().mockResolvedValue([]) };
    productRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSchedulerService,
        { provide: NotificationsService, useValue: notificationsService },
        { provide: getRepositoryToken(Notification), useValue: notificationRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get(NotificationSchedulerService);
  });

  it('notifies only low-stock products and classifies out-of-stock as critical', async () => {
    productRepo.find.mockResolvedValue([
      product({ id: 'p1', stock_quantity: 2, reorder_level: 5 }), // low
      product({ id: 'p2', stock_quantity: 0, reorder_level: 5 }), // out of stock
      product({ id: 'p3', stock_quantity: 50, reorder_level: 5 }), // healthy → skip
      product({ id: 'p4', stock_quantity: 1, reorder_level: 0 }), // no reorder point → skip
    ]);

    const result = await service.checkLowStock(companyId);

    expect(result).toEqual({ checked: 2, notified: 2 });
    expect(notificationsService.create).toHaveBeenCalledTimes(2);
    const types = notificationsService.create.mock.calls.map((c) => c[0].type);
    expect(types).toContain(NotificationType.LOW_STOCK);
    expect(types).toContain(NotificationType.OUT_OF_STOCK);
  });

  it('dedupes against products with an existing unread stock alert', async () => {
    productRepo.find.mockResolvedValue([
      product({ id: 'p1', stock_quantity: 2, reorder_level: 5 }),
      product({ id: 'p2', stock_quantity: 1, reorder_level: 5 }),
    ]);
    // p1 already has an open alert → should be skipped.
    notificationRepo.find.mockResolvedValue([{ data: { productId: 'p1' } }]);

    const result = await service.checkLowStock(companyId);

    expect(result).toEqual({ checked: 2, notified: 1 });
    expect(notificationsService.create).toHaveBeenCalledTimes(1);
    expect(notificationsService.create.mock.calls[0][0].data.productId).toBe('p2');
  });

  it('does nothing when no products are low', async () => {
    productRepo.find.mockResolvedValue([
      product({ id: 'p1', stock_quantity: 99, reorder_level: 5 }),
    ]);

    const result = await service.checkLowStock(companyId);

    expect(result).toEqual({ checked: 0, notified: 0 });
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  /**
   * Service-layer tenant-scoping guard: proves every query this service issues
   * — the product scan, the open-alert dedupe, and the old-notification purge —
   * filters by the caller's company, at the query itself and not just at the
   * controller. See SPEC-CUT-001 S-07.
   */
  describe('tenant scoping', () => {
    beforeEach(() => productRepo.find.mockResolvedValue([]));

    it('scopes the product scan to the caller company_id', async () => {
      await service.checkLowStock('company-A');
      expect(productRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ company_id: 'company-A' }),
        }),
      );
    });

    it('scopes the open-alert dedupe query to the caller company', async () => {
      await service.checkLowStock('company-A');
      expect(notificationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-A' }),
        }),
      );
    });

    it('derives the scope from the argument rather than a fixed company', async () => {
      // A `not.toHaveBeenCalledWith(company-A)` assertion after a single
      // checkLowStock('company-B') would hold for *any* implementation,
      // including one with no tenant filter at all. Driving two different
      // tenants through and comparing the predicates is what actually fails
      // when the scope is hardcoded or dropped.
      await service.checkLowStock('company-A');
      await service.checkLowStock('company-B');

      expect(productRepo.find.mock.calls.map((c) => c[0].where.company_id)).toEqual([
        'company-A',
        'company-B',
      ]);
      expect(
        notificationRepo.find.mock.calls.map((c) => c[0].where.companyId),
      ).toEqual(['company-A', 'company-B']);
    });

    /**
     * cleanOldNotifications issues a bulk DELETE. Without a companyId predicate
     * one tenant's admin purges every other tenant's read notifications, so the
     * predicate is asserted here rather than assumed.
     */
    describe('cleanOldNotifications', () => {
      let qb: {
        delete: jest.Mock;
        from: jest.Mock;
        where: jest.Mock;
        andWhere: jest.Mock;
        execute: jest.Mock;
      };

      const predicates = () =>
        [...qb.where.mock.calls, ...qb.andWhere.mock.calls] as [
          string,
          Record<string, unknown>?,
        ][];

      beforeEach(() => {
        qb = {
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 3 }),
        };
        (notificationRepo as any).createQueryBuilder = jest
          .fn()
          .mockReturnValue(qb);
      });

      it('constrains the purge to the caller company', async () => {
        const result = await service.cleanOldNotifications('company-A');

        expect(result).toEqual({ deleted: 3 });
        expect(qb.execute).toHaveBeenCalledTimes(1);
        expect(
          predicates().some(
            ([sql, params]) =>
              /companyId/.test(sql) && params?.companyId === 'company-A',
          ),
        ).toBe(true);
      });

      it('still filters on read state and the 30-day cutoff', async () => {
        await service.cleanOldNotifications('company-A');

        const sql = predicates().map(([s]) => s);
        expect(sql.some((s) => /isRead/.test(s))).toBe(true);
        expect(sql.some((s) => /createdAt/.test(s))).toBe(true);
      });

      it('requires a company id', async () => {
        await expect(
          (service.cleanOldNotifications as any)(),
        ).rejects.toThrow();
        expect(qb.execute).not.toHaveBeenCalled();
      });
    });
  });
});
