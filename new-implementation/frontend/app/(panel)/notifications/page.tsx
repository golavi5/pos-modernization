'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToolbar } from '@/components/layout/ToolbarContext';
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

const TYPE_LABELS: Record<string, string> = {
  low_stock: 'Stock bajo', out_of_stock: 'Sin stock', sale_milestone: 'Hito de ventas',
  new_user: 'Nuevo usuario', system: 'Sistema', reorder_alert: 'Reorden', large_sale: 'Venta grande',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function NotificationsPage() {
  const { setToolbar } = useToolbar();
  const [query, setQuery] = useState<NotificationQuery>({ page: 1, pageSize: 20 });
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Set toolbar config
  useEffect(() => {
    setToolbar({ title: 'Notificaciones' });
  }, [setToolbar]);

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
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-secondary mt-1">
            {list?.unreadCount
              ? `${list.unreadCount} sin leer · ${list.total} total`
              : `${list?.total || 0} notificaciones`}
          </p>
        </div>
        <div className="flex gap-2">
          {(list?.unreadCount || 0) > 0 && (
            <Button variant="outline" onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas leídas
            </Button>
          )}
          <Button variant="outline" onClick={() => clearRead.mutate()} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar leídas
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
              <option value="">Todos los tipos</option>
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="h-4 w-4"
              />
              Solo sin leer
            </label>
            <Button size="sm" onClick={applyFilters}>Aplicar</Button>
            <Button size="sm" variant="outline" onClick={() => {
              setTypeFilter('');
              setUnreadOnly(false);
              setQuery({ page: 1, pageSize: 20 });
            }}>
              Limpiar
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
              <p className="text-lg font-medium">Sin notificaciones</p>
              <p className="text-sm mt-1">Aquí aparecerán alertas de stock, ventas y sistema</p>
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
                        <span className="text-xs text-quaternary">{TYPE_LABELS[notif.type]}</span>
                        {!notif.isRead && (
                          <button
                            onClick={() => markAsRead.mutate(notif.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Marcar leída
                          </button>
                        )}
                        <button
                          onClick={() => remove.mutate(notif.id)}
                          className="text-xs text-red-500 hover:underline ml-auto"
                        >
                          Eliminar
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
                Página {list.page} de {list.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={list.page <= 1}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page || 1) - 1 }))}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={list.page >= list.totalPages}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page || 1) + 1 }))}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
