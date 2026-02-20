import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationPriority } from '../entities/notification.entity';
import { NotificationQueryDto, NotificationListDto, NotificationResponseDto } from '../dto/notification.dto';
export declare class NotificationsService {
    private readonly notificationRepo;
    private readonly logger;
    constructor(notificationRepo: Repository<Notification>);
    findAll(companyId: string, userId: string, query: NotificationQueryDto): Promise<NotificationListDto>;
    getUnreadCount(companyId: string, userId: string): Promise<{
        count: number;
    }>;
    markAsRead(id: number, companyId: string): Promise<NotificationResponseDto>;
    markAllAsRead(companyId: string, userId: string): Promise<{
        updated: number;
    }>;
    remove(id: number, companyId: string): Promise<{
        message: string;
    }>;
    clearRead(companyId: string): Promise<{
        deleted: number;
    }>;
    create(params: {
        companyId: string;
        userId?: string;
        type: NotificationType;
        priority: NotificationPriority;
        title: string;
        message: string;
        data?: Record<string, any>;
    }): Promise<Notification>;
    notifyLowStock(params: {
        companyId: string;
        productId: number;
        productName: string;
        sku: string;
        currentStock: number;
        reorderPoint: number;
    }): Promise<void>;
    notifyLargeSale(params: {
        companyId: string;
        saleId: number;
        amount: number;
        customerName?: string;
    }): Promise<void>;
    notifyNewUser(params: {
        companyId: string;
        userName: string;
        userEmail: string;
    }): Promise<void>;
    notifySystem(params: {
        companyId: string;
        title: string;
        message: string;
        priority?: NotificationPriority;
    }): Promise<void>;
    private toResponse;
}
