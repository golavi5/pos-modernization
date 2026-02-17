export type NotificationType =
  | 'low_stock'
  | 'out_of_stock'
  | 'sale_milestone'
  | 'new_user'
  | 'system'
  | 'reorder_alert'
  | 'large_sale';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: number;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationList {
  data: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}

export interface NotificationQuery {
  unreadOnly?: boolean;
  type?: NotificationType;
  page?: number;
  pageSize?: number;
}
