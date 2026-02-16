import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLevel } from '../../inventory/entities/stock-level.entity';
import { StockMovement } from '../../inventory/entities/stock-movement.entity';
import { Warehouse } from '../../inventory/entities/warehouse.entity';

/**
 * Inventory Report Service
 * 
 * Provides specialized inventory analytics and reporting.
 * Works alongside ProductReportService for comprehensive inventory insights.
 */
@Injectable()
export class InventoryReportService {
  private readonly logger = new Logger(InventoryReportService.name);

  constructor(
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
  ) {}

  /**
   * Get inventory value by warehouse
   */
  async getInventoryValueByWarehouse(companyId: number): Promise<any[]> {
    const results = await this.stockLevelRepository
      .createQueryBuilder('stock')
      .innerJoin('stock.product', 'product')
      .innerJoin('stock.warehouse', 'warehouse')
      .select('warehouse.id', 'warehouseId')
      .addSelect('warehouse.name', 'warehouseName')
      .addSelect('COUNT(DISTINCT product.id)', 'productCount')
      .addSelect('SUM(stock.quantity)', 'totalUnits')
      .addSelect('SUM(stock.quantity * product.price)', 'totalValue')
      .where('product.companyId = :companyId', { companyId })
      .groupBy('warehouse.id')
      .getRawMany();

    return results.map((row) => ({
      warehouseId: parseInt(row.warehouseId),
      warehouseName: row.warehouseName,
      productCount: parseInt(row.productCount),
      totalUnits: parseInt(row.totalUnits),
      totalValue: parseFloat(row.totalValue),
    }));
  }

  /**
   * Get stock movement summary
   */
  async getStockMovementSummary(
    companyId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const results = await this.stockMovementRepository
      .createQueryBuilder('movement')
      .innerJoin('movement.product', 'product')
      .select('movement.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(ABS(movement.quantityChange))', 'totalQuantity')
      .where('product.companyId = :companyId', { companyId })
      .andWhere('movement.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('movement.type')
      .getRawMany();

    return results.map((row) => ({
      type: row.type,
      count: parseInt(row.count),
      totalQuantity: parseInt(row.totalQuantity),
    }));
  }
}
