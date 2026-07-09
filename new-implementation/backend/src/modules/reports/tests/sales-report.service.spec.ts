import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SalesReportService } from '../services/sales-report.service';
import { Order } from '../../sales/entities/order.entity';
import { OrderItem } from '../../sales/entities/order-item.entity';
import { ReportQueryDto, PeriodType } from '../dto/report-query.dto';

/**
 * Service-layer tenant-scoping guard (complements the controller-layer
 * reports.controller.spec). Proves the query itself filters by company_id —
 * a controller that forwards the right company_id is worthless if the service
 * ignores it. See SPEC-CUT-001 S-07.
 */
describe('SalesReportService (tenant scoping)', () => {
  let service: SalesReportService;
  let orderRepo: { find: jest.Mock };

  const query: ReportQueryDto = {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    period: PeriodType.MONTHLY,
  } as ReportQueryDto;

  beforeEach(async () => {
    orderRepo = { find: jest.fn().mockResolvedValue([]) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesReportService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: { find: jest.fn() } },
      ],
    }).compile();
    service = module.get(SalesReportService);
  });

  it('scopes every order query to the caller company_id', async () => {
    await service.getSalesSummary('company-A', query);

    expect(orderRepo.find).toHaveBeenCalled();
    for (const call of orderRepo.find.mock.calls) {
      expect(call[0].where).toEqual(
        expect.objectContaining({ company_id: 'company-A' }),
      );
    }
  });

  it('never leaks another tenant company_id into the query', async () => {
    await service.getSalesSummary('company-B', query);

    for (const call of orderRepo.find.mock.calls) {
      expect(call[0].where.company_id).toBe('company-B');
      expect(call[0].where.company_id).not.toBe('company-A');
    }
  });
});
