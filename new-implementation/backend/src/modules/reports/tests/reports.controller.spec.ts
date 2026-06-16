import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from '../reports.controller';
import { SalesReportService } from '../services/sales-report.service';
import { ProductReportService } from '../services/product-report.service';
import { CustomerReportService } from '../services/customer-report.service';
import { InventoryReportService } from '../services/inventory-report.service';
import { ExportService } from '../services/export.service';
import { User } from '../../auth/entities/user.entity';

/**
 * Guards the tenant-scoping contract: every reports endpoint must forward the
 * authenticated user's `company_id` to its service. This is the regression that
 * went uncaught as B-01 (controllers passed `user.companyId` → undefined → data
 * leaked across tenants). See SPEC-CUT-001 S-07 / B-01.
 */
describe('ReportsController (tenant scoping)', () => {
  let controller: ReportsController;
  let sales: any;
  let products: any;
  let customers: any;
  let inventory: any;
  let exportSvc: any;

  const query = { startDate: '2026-01-01', endDate: '2026-01-31' } as any;
  const userA = { id: 'u-a', company_id: 'company-A' } as User;
  const userB = { id: 'u-b', company_id: 'company-B' } as User;

  beforeEach(async () => {
    sales = {
      getSalesSummary: jest.fn().mockResolvedValue({}),
      getSalesByPeriod: jest.fn().mockResolvedValue({}),
      getRevenueTrends: jest.fn().mockResolvedValue({}),
    };
    products = {
      getTopSellingProducts: jest.fn().mockResolvedValue([]),
      getLowStockProducts: jest.fn().mockResolvedValue([]),
      getProductReport: jest.fn().mockResolvedValue({}),
      getInventoryTurnover: jest.fn().mockResolvedValue({}),
    };
    customers = {
      getTopCustomers: jest.fn().mockResolvedValue([]),
      getCustomerSegments: jest.fn().mockResolvedValue([]),
      getCustomerReport: jest.fn().mockResolvedValue({}),
    };
    inventory = {
      getInventoryValueByWarehouse: jest.fn().mockResolvedValue([]),
    };
    exportSvc = {
      export: jest.fn().mockResolvedValue({
        buffer: Buffer.from('x'),
        filename: 'r.csv',
        mimeType: 'text/csv',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: SalesReportService, useValue: sales },
        { provide: ProductReportService, useValue: products },
        { provide: CustomerReportService, useValue: customers },
        { provide: InventoryReportService, useValue: inventory },
        { provide: ExportService, useValue: exportSvc },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('sales endpoints scope to the user company_id', async () => {
    await controller.getSalesSummary(userA, query);
    await controller.getSalesByPeriod(userA, query);
    await controller.getRevenueTrends(userA, query);
    expect(sales.getSalesSummary).toHaveBeenCalledWith('company-A', query);
    expect(sales.getSalesByPeriod).toHaveBeenCalledWith('company-A', query);
    expect(sales.getRevenueTrends).toHaveBeenCalledWith('company-A', query);
  });

  it('product endpoints scope to the user company_id', async () => {
    await controller.getTopSellingProducts(userA, query);
    await controller.getLowStockProducts(userA, query);
    await controller.getProductReport(userA, query);
    await controller.getInventoryTurnover(userA, query);
    expect(products.getTopSellingProducts).toHaveBeenCalledWith('company-A', query);
    expect(products.getLowStockProducts).toHaveBeenCalledWith('company-A', query);
    expect(products.getProductReport).toHaveBeenCalledWith('company-A', query);
    expect(products.getInventoryTurnover).toHaveBeenCalledWith('company-A', query);
  });

  it('customer endpoints scope to the user company_id', async () => {
    await controller.getTopCustomers(userA, query);
    await controller.getCustomerSegments(userA, query);
    await controller.getCustomerReport(userA, query);
    expect(customers.getTopCustomers).toHaveBeenCalledWith('company-A', query);
    expect(customers.getCustomerSegments).toHaveBeenCalledWith('company-A', query);
    expect(customers.getCustomerReport).toHaveBeenCalledWith('company-A', query);
  });

  it('inventory value endpoint scopes to the user company_id', async () => {
    await controller.getInventoryValueByWarehouse(userA);
    expect(inventory.getInventoryValueByWarehouse).toHaveBeenCalledWith('company-A');
  });

  it('export endpoints scope source data to the user company_id and stream the file', async () => {
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.exportSalesReport(userA, { ...query, format: 'csv' } as any, res);
    expect(sales.getSalesByPeriod).toHaveBeenCalledWith('company-A', expect.anything());

    await controller.exportProductReport(userA, { ...query, format: 'csv' } as any, res);
    expect(products.getProductReport).toHaveBeenCalledWith('company-A', expect.anything());

    await controller.exportCustomerReport(userA, { ...query, format: 'csv' } as any, res);
    expect(customers.getCustomerReport).toHaveBeenCalledWith('company-A', expect.anything());

    expect(exportSvc.export).toHaveBeenCalledTimes(3);
    expect(res.send).toHaveBeenCalledTimes(3);
  });

  it('uses each caller’s own company — never a different tenant', async () => {
    await controller.getSalesSummary(userB, query);
    expect(sales.getSalesSummary).toHaveBeenCalledWith('company-B', query);
    expect(sales.getSalesSummary).not.toHaveBeenCalledWith('company-A', query);
  });
});
