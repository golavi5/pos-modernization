import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from '../entities/notification.entity';

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
  ) {}

  /**
   * Check for low stock and generate notifications.
   * Call this manually or schedule with @Cron('0 * * * *') // every hour
   */
  async checkLowStock(companyId: string): Promise<{ checked: number; notified: number }> {
    this.logger.log(`Checking low stock for company ${companyId}`);

    // This query depends on StockLevel entity from inventory module
    // For now, return a placeholder response
    // In production, inject StockLevel repository and query it
    
    this.logger.log('Low stock check completed');
    return { checked: 0, notified: 0 };
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
