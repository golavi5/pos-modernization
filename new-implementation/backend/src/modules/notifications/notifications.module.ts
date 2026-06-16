import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationSchedulerService } from './services/notification-scheduler.service';
import { Notification } from './entities/notification.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Product])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationSchedulerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
