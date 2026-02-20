import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from '../entities/notification.entity';
export declare class NotificationSchedulerService {
    private readonly notificationsService;
    private readonly notificationRepo;
    private readonly logger;
    constructor(notificationsService: NotificationsService, notificationRepo: Repository<Notification>);
    checkLowStock(companyId: string): Promise<{
        checked: number;
        notified: number;
    }>;
    cleanOldNotifications(): Promise<{
        deleted: number;
    }>;
}
