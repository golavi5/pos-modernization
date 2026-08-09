'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useClearRead,
  useRemoveNotification,
} from '@/hooks/useNotifications';
import { Bell, CheckCheck, Trash2, X, Filter } from 'lucide-react';
import type { NotificationQuery, Notification, NotificationType } from '@/types/notifications';

const PRIORITY_STYLES: Record<string, { dot: string; badge: string }> = {
  critical: { dot: 'bg-error', badge: 'bg-error-subtle text-error border-error' },
  high:     { dot: 'bg-warning', badge: 'bg-warning-subtle text-warning border-warning' },
  medium:   { dot: 'bg-primary', badge: 'bg-primary-subtle text-primary border-primary' },
  low:      { dot: 'bg-quaternary', badge: 'bg-surface-2 text-tertiary border' },
};

const TYPE_ICONS: Record<string, string> = {
  low_stock: '📦', out_of_stock: '⚠️', sale_milestone: '🎯',
  new_user: '👤', system: '⚙️', reorder_alert: '🔔', large_sale: '💰',
};

const TYPE_LABEL_KEYS: Record<string, string> = {
  low_stock: 'lowStock', out_of_stock: 'outOfStock', sale_milestone: 'salesMilestone',
  new_user: 'newUser', system: 'system', reorder_alert: 'reorder', large_sale: 'largeSale',
};

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t('justNow');
    if (min < 60) return t('minutesAgo', { min });
    const h = Math.floor(min / 60);
    if (h < 24) return t('hoursAgo', { h });
    return t('daysAgo', { d: Math.floor(h / 24) });
  };

  const [query, setQuery] = useState<NotificationQuery>({ page: 1, pageSize: 20 });
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: list, isLoading } = useNotifications(query);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const clearRead = useClearRead();
  const remove = useRemoveNotification();

  const applyFilters = () => {
    setQuery({
      page: 1,
      pageSize: 20,
      type: typeFilter ? (typeFilter as NotificationType) : undefined,
      unreadOnly: unreadOnly || undefined,
    });
  };

  const notifications = list?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-secondary mt-1">
            {list?.unreadCount
              ? t('unreadCount', { unread: list.unreadCount, total: list.total })
              : t('totalCount', { total: list?.total || 0 })}
          </p>
        </div>
        <div className="flex gap-2">
          {(list?.unreadCount || 0) > 0 && (
            <Button variant="outline" onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="h-4 w-4 mr-2" />
              {t('markAllRead')}
            </Button>
          )}
          <Button variant="outline" onClick={() => clearRead.mutate()} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            {t('clearRead')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 items-center flex-wrap">
            <Filter className="h-4 w-4 text-quaternary" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{tCommon('allTypes')}</option>
              {Object.entries(TYPE_LABEL_KEYS).map(([val, key]) => (
                <option key={val} value={val}>{t(`types.${key}`)}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="h-4 w-4"
              />
              {t('onlyUnread')}
            </label>
            <Button size="sm" onClick={applyFilters}>{tCommon('apply')}</Button>
            <Button size="sm" variant="outline" onClick={() => {
              setTypeFilter('');
              setUnreadOnly(false);
              setQuery({ page: 1, pageSize: 20 });
            }}>
              {tCommon('clear')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications list */}
      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3 pt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-quaternary">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">{t('noNotifications')}</p>
              <p className="text-sm mt-1">{t('noNotificationsDesc')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif: Notification) => {
                const priority = PRIORITY_STYLES[notif.priority] || PRIORITY_STYLES.low;
                return (
                  <div
                    key={notif.id}
                    className={`flex gap-4 py-4 px-4 hover:bg-gray-50 transition-colors ${
                      !notif.isRead ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    {/* Priority indicator */}
                    <div className="flex-shrink-0 mt-1">
                      <span className={`inline-block h-3 w-3 rounded-full ${priority.dot}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-medium ${notif.isRead ? 'text-secondary' : ''}`}>
                            {TYPE_ICONS[notif.type]} {notif.title}
                          </p>
                          <p className="text-sm text-tertiary mt-1">{notif.message}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${priority.badge}`}>
                            {notif.priority}
                          </span>
                          {!notif.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-quaternary">{timeAgo(notif.createdAt)}</span>
                        <span className="text-xs text-quaternary">{TYPE_LABEL_KEYS[notif.type] ? t(`types.${TYPE_LABEL_KEYS[notif.type]}`) : notif.type}</span>
                        {!notif.isRead && (
                          <button
                            onClick={() => markAsRead.mutate(notif.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {t('markRead')}
                          </button>
                        )}
                        <button
                          onClick={() => remove.mutate(notif.id)}
                          className="text-xs text-red-500 hover:underline ml-auto"
                        >
                          {tCommon('delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {list && list.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-2">
              <p className="text-sm text-tertiary">
                {t('pagination', { page: list.page, totalPages: list.totalPages })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={list.page <= 1}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page || 1) - 1 }))}>
                  {tCommon('previous')}
                </Button>
                <Button variant="outline" size="sm" disabled={list.page >= list.totalPages}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page || 1) + 1 }))}>
                  {tCommon('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
