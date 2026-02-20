import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StockMovement } from '../../inventory/entities/stock-movement.entity';
import { Warehouse } from '../../inventory/entities/warehouse.entity';
import { Product } from '../../products/entities/product.entity';

/**
 * Inventory Report Service
 *
 * Provides specialized inventory analytics and reporting.
 */
@Injectable()
export class InventoryReportService {
  private readonly logger = new Logger(InventoryReportService.name);

  constructor(
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Get inventory value by warehouse
   */
  async getInventoryValueByWarehouse(companyId: string): Promise<any[]> {
    const warehouses = await this.warehouseRepository.find({
      where: { company_id: companyId },
    });

    return warehouses.map((warehouse) => ({
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      productCount: 0,
      totalUnits: 0,
      totalValue: 0,
    }));
  }

  /**
   * Get stock movement summary
   */
  async getStockMovementSummary(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const results = await this.stockMovementRepository
      .createQueryBuilder('movement')
      .select('movement.movement_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(ABS(movement.quantity))', 'totalQuantity')
      .where('movement.company_id = :companyId', { companyId })
      .andWhere('movement.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('movement.movement_type')
      .getRawMany();

    return results.map((row) => ({
      type: row.type,
      count: parseInt(row.count),
      totalQuantity: parseInt(row.totalQuantity || '0'),
    }));
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(companyId: string): Promise<any[]> {
    const products = await this.productRepository.find({
      where: {
        company_id: companyId,
        is_active: true,
      },
    });

    return products
      .filter((p) => p.stock_quantity <= p.reorder_level)
      .map((product) => ({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock: product.stock_quantity,
        reorderLevel: product.reorder_level,
        stockLevel:
          product.stock_quantity === 0
            ? 'critical'
            : product.stock_quantity <= product.reorder_level * 0.5
              ? 'critical'
              : 'low',
      }));
  }
}
