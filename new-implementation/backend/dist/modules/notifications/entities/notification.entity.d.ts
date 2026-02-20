export declare enum NotificationType {
    LOW_STOCK = "low_stock",
    OUT_OF_STOCK = "out_of_stock",
    SALE_MILESTONE = "sale_milestone",
    NEW_USER = "new_user",
    SYSTEM = "system",
    REORDER_ALERT = "reorder_alert",
    LARGE_SALE = "large_sale"
}
export declare enum NotificationPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare class Notification {
    id: number;
    companyId: string;
    userId: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    data: Record<string, any>;
    isRead: boolean;
    readAt: Date;
    createdAt: Date;
}
