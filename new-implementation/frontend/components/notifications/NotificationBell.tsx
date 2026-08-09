'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useUnreadCount,
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useClearRead,
} from '@/hooks/useNotifications';
import type { Notification } from '@/types/notifications';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-quaternary',
};

const TYPE_ICONS: Record<string, string> = {
  low_stock: '📦',
  out_of_stock: '⚠️',
  sale_milestone: '🎯',
  new_user: '👤',
  system: '⚙️',
  reorder_alert: '🔔',
  large_sale: '💰',
};

export function NotificationBell() {
  const t = useTranslations('notifications');

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('bell.justNow');
    if (minutes < 60) return t('bell.minutesAgo', { min: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('hoursAgo', { h: hours });
    const days = Math.floor(hours / 24);
    return t('daysAgo', { d: days });
  };

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useUnreadCount();
  const { data: notifList } = useNotifications({ pageSize: 10 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const clearRead = useClearRead();

  const unreadCount = unreadData?.count || 0;
  const notifications = notifList?.data || [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = (notif: Notification) => {
    if (!notif.isRead) markAsRead.mutate(notif.id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label={t('title')}
      >
        <Bell className="h-5 w-5 text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-96 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div>
              <h3 className="font-semibold">{t('title')}</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-tertiary">{t('bell.unread', { count: unreadCount })}</p>
              )}
            </div>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  className="p-1.5 rounded hover:bg-hover-bg text-tertiary hover:text-secondary"
                  title={t('bell.markAllRead')}
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => clearRead.mutate()}
                className="p-1.5 rounded hover:bg-hover-bg text-tertiary hover:text-secondary"
                title={t('clearRead')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-hover-bg text-tertiary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-quaternary">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t('noNotifications')}</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkRead(notif)}
                  className={`flex gap-3 px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    notif.isRead ? 'opacity-60' : 'bg-blue-50/30'
                  }`}
                >
                  {/* Priority dot */}
                  <div className="mt-1 flex-shrink-0">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        PRIORITY_COLORS[notif.priority] || 'bg-quaternary'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-tight ${notif.isRead ? 'text-secondary' : ''}`}>
                        {TYPE_ICONS[notif.type]} {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-tertiary mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-quaternary mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t bg-gray-50 text-center">
              <a
                href="/notifications"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => setOpen(false)}
              >
                {t('bell.viewAll')}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
