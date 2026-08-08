import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SalesReportService } from '../services/sales-report.service';
import { Order } from '../../sales/entities/order.entity';
import { OrderItem } from '../../sales/entities/order-item.entity';
import { ReportQueryDto, PeriodType } from '../dto/report-query.dto';

type MockQb = {
  select: jest.Mock;
  addSelect: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  groupBy: jest.Mock;
  orderBy: jest.Mock;
  getRawMany: jest.Mock;
};

const mockQb = (): MockQb => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
});

/** True when this query builder constrained order.company_id to `companyId`. */
const isScopedTo = (qb: MockQb, companyId: string): boolean =>
  [...qb.where.mock.calls, ...qb.andWhere.mock.calls].some(
    ([sql, params]: [string, Record<string, unknown>?]) =>
      /order\.company_id/.test(sql) && params?.companyId === companyId,
  );

/**
 * Service-layer tenant-scoping guard (complements the controller-layer
 * reports.controller.spec). Proves the query itself filters by company_id —
 * a controller that forwards the right company_id is worthless if the service
 * ignores it. See SPEC-CUT-001 S-07.
 *
 * The service mixes access patterns: `calculatePeriodMetrics` goes through
 * `Repository.find`, while `getSalesGroupedByPeriod` and
 * `getRevenueByPaymentMethod` build SQL with `createQueryBuilder`. Both kinds
 * are exercised here — asserting only on `find` would leave the query-builder
 * paths behind `GET /reports/sales-by-period` and `GET /reports/revenue-trends`
 * free to drop their company_id clause with the suite still green.
 */
describe('SalesReportService (tenant scoping)', () => {
  let service: SalesReportService;
  let orderRepo: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let builders: MockQb[];

  const query: ReportQueryDto = {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    period: PeriodType.MONTHLY,
  } as ReportQueryDto;

  beforeEach(async () => {
    builders = [];
    orderRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => {
        const qb = mockQb();
        builders.push(qb);
        return qb;
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesReportService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: { find: jest.fn() } },
      ],
    }).compile();
    service = module.get(SalesReportService);
  });

  it('scopes the summary metrics query to the caller company_id', async () => {
    await service.getSalesSummary('company-A', query);

    expect(orderRepo.find).toHaveBeenCalled();
    for (const call of orderRepo.find.mock.calls) {
      expect(call[0].where).toEqual(
        expect.objectContaining({ company_id: 'company-A' }),
      );
    }
  });

  it('never leaks another tenant company_id into the summary query', async () => {
    await service.getSalesSummary('company-B', query);

    // Without this the loop below is vacuous — it would pass by iterating
    // nothing if the service ever stopped using Repository.find.
    expect(orderRepo.find).toHaveBeenCalled();
    for (const call of orderRepo.find.mock.calls) {
      expect(call[0].where.company_id).toBe('company-B');
    }
  });

  it('scopes the period-grouping query builder to the caller company_id', async () => {
    await service.getSalesByPeriod('company-A', query);

    expect(builders.length).toBeGreaterThan(0);
    for (const qb of builders) {
      expect(isScopedTo(qb, 'company-A')).toBe(true);
    }
  });

  it('scopes both revenue-trend query builders to the caller company_id', async () => {
    await service.getRevenueTrends('company-A', query);

    // Trends + revenue-by-payment-method: two distinct builders, both scoped.
    expect(builders.length).toBeGreaterThanOrEqual(2);
    for (const qb of builders) {
      expect(isScopedTo(qb, 'company-A')).toBe(true);
    }
  });

  it('never leaks another tenant company_id into a query builder', async () => {
    await service.getRevenueTrends('company-B', query);

    expect(builders.length).toBeGreaterThanOrEqual(2);
    for (const qb of builders) {
      expect(isScopedTo(qb, 'company-A')).toBe(false);
      expect(isScopedTo(qb, 'company-B')).toBe(true);
    }
  });
});
