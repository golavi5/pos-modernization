import { NotificationType, NotificationPriority } from '../entities/notification.entity';
export declare class NotificationQueryDto {
    unreadOnly?: boolean;
    type?: NotificationType;
    page?: number;
    pageSize?: number;
}
export declare class NotificationResponseDto {
    id: number;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    data: Record<string, any>;
    isRead: boolean;
    readAt?: Date;
    createdAt: Date;
}
export declare class NotificationListDto {
    data: NotificationResponseDto[];
    total: number;
    unreadCount: number;
    page: number;
    totalPages: number;
}
export declare class UnreadCountDto {
    count: number;
}
