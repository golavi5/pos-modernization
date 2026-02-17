import { apiClient } from './client';
import type { Notification, NotificationList, NotificationQuery } from '@/types/notifications';

const BASE = '/notifications';

export const notificationsApi = {
  getAll: (query: NotificationQuery = {}) =>
    apiClient.get<NotificationList>(BASE, { params: query }),

  getUnreadCount: () =>
    apiClient.get<{ count: number }>(`${BASE}/unread-count`),

  markAsRead: (id: number) =>
    apiClient.patch<Notification>(`${BASE}/${id}/read`),

  markAllAsRead: () =>
    apiClient.patch<{ updated: number }>(`${BASE}/read-all`),

  clearRead: () =>
    apiClient.delete<{ deleted: number }>(`${BASE}/clear-read`),

  remove: (id: number) =>
    apiClient.delete<{ message: string }>(`${BASE}/${id}`),

  createTest: (data: { title: string; message: string; type?: string; priority?: string }) =>
    apiClient.post<Notification>(`${BASE}/test`, data),
};
