import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications';
import type { NotificationQuery } from '@/types/notifications';

export const notifKeys = {
  all: ['notifications'] as const,
  list: (q: NotificationQuery) => ['notifications', 'list', q] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
};

export function useNotifications(query: NotificationQuery = {}) {
  return useQuery({
    queryKey: notifKeys.list(query),
    queryFn: () => notificationsApi.getAll(query).then((r) => r.data),
    staleTime: 30 * 1000, // 30 seconds - notifications need to be fresh
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notifKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.data),
    refetchInterval: 60 * 1000, // poll every 60 seconds
    staleTime: 30 * 1000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead().then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all });
    },
  });
}

export function useClearRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.clearRead().then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all });
    },
  });
}

export function useRemoveNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.remove(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all });
    },
  });
}
