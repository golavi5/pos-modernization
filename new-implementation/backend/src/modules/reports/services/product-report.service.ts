import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Product } from '../../products/product.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';
import { StockLevel } from '../../inventory/entities/stock-level.entity';
import { StockMovement } from '../../inventory/entities/stock-movement.entity';
import { ReportQueryDto } from '../dto/report-query.dto';
import {
  TopSellingProductDto,
  LowStockProductDto,
  ProductReportDto,
  InventoryTurnoverDto,
  InventoryReportDto,
} from '../dto/product-report.dto';

@Injectable()
export class ProductReportService {
  private readonly logger = new Logger(ProductReportService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepository: Repository<SaleItem>,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
  ) {}

  /**
   * Get top selling products
   */
  async getTopSellingProducts(
    companyId: number,
    query: ReportQueryDto,
  ): Promise<TopSellingProductDto[]> {
    const { startDate, endDate } = this.getDateRange(query);
    const limit = query.limit || 10;

    const results = await this.saleItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.sale', 'sale')
      .innerJoin('item.product', 'product')
      .leftJoin('product.category', 'category')
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('product.sku', 'sku')
      .addSelect('category.name', 'category')
      .addSelect('SUM(item.quantity)', 'totalQuantitySold')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .addSelect('AVG(item.unitPrice)', 'averagePrice')
      .addSelect('COUNT(DISTINCT sale.id)', 'transactionCount')
      .where('sale.companyId = :companyId', { companyId })
      .andWhere('sale.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('product.id')
      .orderBy('totalQuantitySold', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((row) => ({
      productId: parseInt(row.productId),
      productName: row.productName,
      sku: row.sku,
      category: row.category || 'Sin categoría',
      totalQuantitySold: parseInt(row.totalQuantitySold),
      totalRevenue: parseFloat(row.totalRevenue),
      averagePrice: parseFloat(row.averagePrice),
      transactionCount: parseInt(row.transactionCount),
    }));
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(
    companyId: number,
    query: ReportQueryDto,
  ): Promise<LowStockProductDto[]> {
    const stockLevels = await this.stockLevelRepository
      .createQueryBuilder('stock')
      .innerJoin('stock.product', 'product')
      .innerJoin('stock.warehouse', 'warehouse')
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('product.sku', 'sku')
      .addSelect('stock.quantity', 'currentStock')
      .addSelect('stock.reorderPoint', 'reorderPoint')
      .addSelect('warehouse.name', 'warehouseName')
      .where('product.companyId = :companyId', { companyId })
      .andWhere('stock.quantity <= stock.reorderPoint')
      .orderBy('stock.quantity', 'ASC')
      .limit(query.limit || 50)
      .getRawMany();

    return Promise.all(
      stockLevels.map(async (row) => {
        const currentStock = parseInt(row.currentStock);
        const reorderPoint = parseInt(row.reorderPoint);

        let stockLevel: string;
        if (currentStock === 0) {
          stockLevel = 'critical';
        } else if (currentStock <= reorderPoint * 0.5) {
          stockLevel = 'critical';
        } else {
          stockLevel = 'low';
        }

        // Calculate days until stockout based on average daily sales
        const daysUntilStockout = await this.calculateDaysUntilStockout(
          parseInt(row.productId),
          currentStock,
        );

        return {
          productId: parseInt(row.productId),
          productName: row.productName,
          sku: row.sku,
          currentStock,
          reorderPoint,
          stockLevel,
          warehouseName: row.warehouseName,
          daysUntilStockout,
        };
      }),
    );
  }

  /**
   * Get inventory turnover report
   */
  async getInventoryTurnover(
    companyId: number,
    query: ReportQueryDto,
  ): Promise<InventoryReportDto> {
    const { startDate, endDate } = this.getDateRange(query);
    const periodDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get all products with their turnover data
    const products = await this.productRepository.find({
      where: { companyId },
      relations: ['category', 'stockLevels'],
    });

    const turnoverData: InventoryTurnoverDto[] = [];

    for (const product of products) {
      // Calculate average stock during period
      const averageStock = await this.calculateAverageStock(
        product.id,
        startDate,
        endDate,
      );

      // Calculate total sold in period
      const totalSold = await this.calculateTotalSold(
        product.id,
        startDate,
        endDate,
      );

      // Calculate turnover rate (times per period)
      const turnoverRate =
        averageStock > 0 ? totalSold / averageStock : 0;

      // Calculate days of inventory (how many days until stock runs out)
      const daysOfInventory =
        turnoverRate > 0 ? periodDays / turnoverRate : 999;

      // Classify product status
      let status: string;
      if (turnoverRate >= 4) {
        status = 'fast-moving';
      } else if (turnoverRate >= 1) {
        status = 'slow-moving';
      } else {
        status = 'dead-stock';
      }

      turnoverData.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        averageStock,
        totalSold,
        turnoverRate,
        daysOfInventory,
        category: product.category?.name || 'Sin categoría',
        status,
      });
    }

    // Sort by turnover rate (fastest first)
    turnoverData.sort((a, b) => b.turnoverRate - a.turnoverRate);

    // Calculate summary statistics
    const averageTurnoverRate =
      turnoverData.reduce((sum, item) => sum + item.turnoverRate, 0) /
      turnoverData.length;

    const fastMovingCount = turnoverData.filter(
      (item) => item.status === 'fast-moving',
    ).length;
    const slowMovingCount = turnoverData.filter(
      (item) => item.status === 'slow-moving',
    ).length;
    const deadStockCount = turnoverData.filter(
      (item) => item.status === 'dead-stock',
    ).length;

    return {
      turnover: turnoverData.slice(0, query.limit || 50),
      averageTurnoverRate,
      totalProducts: turnoverData.length,
      fastMovingCount,
      slowMovingCount,
      deadStockCount,
      generatedAt: new Date(),
    };
  }

  /**
   * Get comprehensive product report
   */
  async getProductReport(
    companyId: number,
    query: ReportQueryDto,
  ): Promise<ProductReportDto> {
    const topSelling = await this.getTopSellingProducts(companyId, query);
    const lowStock = await this.getLowStockProducts(companyId, query);

    return {
      topSelling,
      lowStock,
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate average stock for a product during a period
   */
  private async calculateAverageStock(
    productId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Get stock movements during period
    const movements = await this.stockMovementRepository.find({
      where: {
        productId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'ASC' },
    });

    if (movements.length === 0) {
      // If no movements, get current stock
      const currentStock = await this.stockLevelRepository.findOne({
        where: { productId },
      });
      return currentStock?.quantity || 0;
    }

    // Calculate average based on movements
    let totalStock = 0;
    let days = 0;

    // Simple average of all recorded quantities
    movements.forEach((movement) => {
      totalStock += movement.quantityAfter;
      days++;
    });

    return days > 0 ? totalStock / days : 0;
  }

  /**
   * Calculate total quantity sold for a product during a period
   */
  private async calculateTotalSold(
    productId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.saleItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.sale', 'sale')
      .select('SUM(item.quantity)', 'total')
      .where('item.productId = :productId', { productId })
      .andWhere('sale.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return parseInt(result?.total) || 0;
  }

  /**
   * Calculate estimated days until stockout
   */
  private async calculateDaysUntilStockout(
    productId: number,
    currentStock: number,
  ): Promise<number | undefined> {
    if (currentStock === 0) return 0;

    // Get average daily sales from last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const totalSold = await this.calculateTotalSold(
      productId,
      startDate,
      endDate,
    );
    const averageDailySales = totalSold / 30;

    if (averageDailySales === 0) return undefined;

    return Math.ceil(currentStock / averageDailySales);
  }

  /**
   * Get date range based on query parameters
   */
  private getDateRange(query: ReportQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    if (query.startDate && query.endDate) {
      return {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      };
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    return { startDate, endDate };
  }
}
