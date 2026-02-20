import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { OrderItem } from '../../sales/entities/order-item.entity';
import { Order } from '../../sales/entities/order.entity';
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
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
  ) {}

  /**
   * Get top selling products
   */
  async getTopSellingProducts(
    companyId: string,
    query: ReportQueryDto,
  ): Promise<TopSellingProductDto[]> {
    const { startDate, endDate } = this.getDateRange(query);
    const limit = query.limit || 10;

    const results = await this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('item.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('product.sku', 'sku')
      .addSelect('SUM(item.quantity)', 'totalQuantitySold')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .addSelect('AVG(item.unit_price)', 'averagePrice')
      .addSelect('COUNT(DISTINCT order.id)', 'transactionCount')
      .where('order.company_id = :companyId', { companyId })
      .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('product.id')
      .orderBy('totalQuantitySold', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      sku: row.sku,
      category: 'Sin categor\u00eda',
      totalQuantitySold: parseInt(row.totalQuantitySold || '0'),
      totalRevenue: parseFloat(row.totalRevenue || '0'),
      averagePrice: parseFloat(row.averagePrice || '0'),
      transactionCount: parseInt(row.transactionCount || '0'),
    }));
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(
    companyId: string,
    query: ReportQueryDto,
  ): Promise<LowStockProductDto[]> {
    const products = await this.productRepository.find({
      where: {
        company_id: companyId,
        is_active: true,
      },
      order: { stock_quantity: 'ASC' },
      take: query.limit || 50,
    });

    return products
      .filter((p) => p.stock_quantity <= p.reorder_level)
      .map((product) => {
        let stockLevel: string;
        if (product.stock_quantity === 0) {
          stockLevel = 'critical';
        } else if (product.stock_quantity <= product.reorder_level * 0.5) {
          stockLevel = 'critical';
        } else {
          stockLevel = 'low';
        }

        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock: product.stock_quantity,
          reorderPoint: product.reorder_level,
          stockLevel,
          warehouseName: 'Default',
          daysUntilStockout: undefined,
        };
      });
  }

  /**
   * Get inventory turnover report
   */
  async getInventoryTurnover(
    companyId: string,
    query: ReportQueryDto,
  ): Promise<InventoryReportDto> {
    const { startDate, endDate } = this.getDateRange(query);
    const periodDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const products = await this.productRepository.find({
      where: { company_id: companyId },
    });

    const turnoverData: InventoryTurnoverDto[] = [];

    for (const product of products) {
      const totalSold = await this.calculateTotalSold(
        product.id,
        startDate,
        endDate,
      );
      const averageStock = product.stock_quantity;
      const turnoverRate = averageStock > 0 ? totalSold / averageStock : 0;
      const daysOfInventory = turnoverRate > 0 ? periodDays / turnoverRate : 999;

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
        category: 'Sin categor\u00eda',
        status,
      });
    }

    turnoverData.sort((a, b) => b.turnoverRate - a.turnoverRate);

    const averageTurnoverRate =
      turnoverData.length > 0
        ? turnoverData.reduce((sum, item) => sum + item.turnoverRate, 0) /
          turnoverData.length
        : 0;

    return {
      turnover: turnoverData.slice(0, query.limit || 50),
      averageTurnoverRate,
      totalProducts: turnoverData.length,
      fastMovingCount: turnoverData.filter((i) => i.status === 'fast-moving')
        .length,
      slowMovingCount: turnoverData.filter((i) => i.status === 'slow-moving')
        .length,
      deadStockCount: turnoverData.filter((i) => i.status === 'dead-stock')
        .length,
      generatedAt: new Date(),
    };
  }

  /**
   * Get comprehensive product report
   */
  async getProductReport(
    companyId: string,
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
   * Calculate total quantity sold for a product during a period
   */
  private async calculateTotalSold(
    productId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .select('SUM(item.quantity)', 'total')
      .where('item.product_id = :productId', { productId })
      .andWhere('order.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return parseInt(result?.total) || 0;
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
