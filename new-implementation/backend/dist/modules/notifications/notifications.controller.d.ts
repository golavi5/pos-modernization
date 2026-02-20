import { NotificationsService } from './services/notifications.service';
import { NotificationSchedulerService } from './services/notification-scheduler.service';
import { NotificationQueryDto, NotificationListDto, NotificationResponseDto, UnreadCountDto } from './dto/notification.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly schedulerService;
    constructor(notificationsService: NotificationsService, schedulerService: NotificationSchedulerService);
    findAll(user: any, query: NotificationQueryDto): Promise<NotificationListDto>;
    getUnreadCount(user: any): Promise<UnreadCountDto>;
    markAsRead(id: number, user: any): Promise<NotificationResponseDto>;
    markAllAsRead(user: any): Promise<{
        updated: number;
    }>;
    clearRead(user: any): Promise<{
        deleted: number;
    }>;
    remove(id: number, user: any): Promise<{
        message: string;
    }>;
    createTest(user: any, body: {
        title: string;
        message: string;
        type?: string;
        priority?: string;
    }): Promise<NotificationResponseDto>;
    checkStock(user: any): Promise<{
        checked: number;
        notified: number;
    }>;
    cleanOld(): Promise<{
        deleted: number;
    }>;
}
