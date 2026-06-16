import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../entities/notification.entity';
import { Product } from '../../products/entities/product.entity';

/**
 * NotificationSchedulerService
 * 
 * Handles automatic notification generation.
 * In production, use @nestjs/schedule with @Cron decorators.
 * 
 * Install: npm install @nestjs/schedule
 * Add ScheduleModule.forRoot() to AppModule imports.
 * 
 * Currently provides manual trigger endpoints for demonstration.
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  /**
   * Check for low stock and generate notifications for the company.
   * Call this manually or schedule with @Cron('0 * * * *') // every hour
   *
   * Dedupes against existing UNREAD low/out-of-stock notifications so repeated
   * runs don't spam the same product. Returns how many low-stock products were
   * found (`checked`) and how many new notifications were created (`notified`).
   */
  async checkLowStock(
    companyId: string,
  ): Promise<{ checked: number; notified: number }> {
    this.logger.log(`Checking low stock for company ${companyId}`);

    const products = await this.productRepo.find({
      where: { company_id: companyId, is_active: true },
    });
    const lowStock = products.filter(
      (p) => p.reorder_level > 0 && p.stock_quantity <= p.reorder_level,
    );

    // Skip products that already have an open (unread) stock alert.
    const openAlerts = await this.notificationRepo.find({
      where: {
        companyId,
        isRead: false,
        type: In([NotificationType.LOW_STOCK, NotificationType.OUT_OF_STOCK]),
      },
    });
    const alreadyAlerted = new Set(
      openAlerts.map((n) => n.data?.productId).filter(Boolean),
    );

    let notified = 0;
    for (const product of lowStock) {
      if (alreadyAlerted.has(product.id)) continue;
      const isCritical = product.stock_quantity === 0;
      await this.notificationsService.create({
        companyId,
        type: isCritical
          ? NotificationType.OUT_OF_STOCK
          : NotificationType.LOW_STOCK,
        priority: isCritical
          ? NotificationPriority.CRITICAL
          : NotificationPriority.HIGH,
        title: isCritical
          ? `⚠️ Sin stock: ${product.name}`
          : `📦 Stock bajo: ${product.name}`,
        message: isCritical
          ? `El producto "${product.name}" (${product.sku}) se quedó sin stock.`
          : `El producto "${product.name}" (${product.sku}) tiene ${product.stock_quantity} unidades (punto de reorden: ${product.reorder_level}).`,
        data: {
          productId: product.id,
          sku: product.sku,
          currentStock: product.stock_quantity,
          reorderPoint: product.reorder_level,
        },
      });
      notified++;
    }

    this.logger.log(
      `Low stock check completed: ${lowStock.length} low, ${notified} notified`,
    );
    return { checked: lowStock.length, notified };
  }

  /**
   * Clean old read notifications (older than 30 days)
   * Schedule with @Cron('0 2 * * *') // every day at 2am
   */
  async cleanOldNotifications(): Promise<{ deleted: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('isRead = true')
      .andWhere('createdAt < :cutoff', { cutoff: thirtyDaysAgo })
      .execute();

    this.logger.log(`Cleaned ${result.affected} old notifications`);
    return { deleted: result.affected || 0 };
  }
}
