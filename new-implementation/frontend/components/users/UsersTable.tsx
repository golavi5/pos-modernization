'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUsers } from '@/hooks/useUsers';
import type { UserResponse } from '@/types/users';
import { Pencil, Shield, KeyRound, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  staff: 'bg-blue-100 text-blue-700',
  cashier: 'bg-green-100 text-green-700',
};

interface UsersTableProps {
  /** If provided, the component owns its own data fetch filtered by search */
  search?: string;
  /** Legacy: pass data directly */
  users?: UserResponse[];
  isLoading?: boolean;
  onEdit?: (user: UserResponse) => void;
  onAssignRoles?: (user: UserResponse) => void;
  onResetPassword?: (user: UserResponse) => void;
  onToggleStatus?: (user: UserResponse) => void;
  onDelete?: (user: UserResponse) => void;
}

export function UsersTable({
  search,
  users: usersProp,
  isLoading: isLoadingProp,
  onEdit,
  onAssignRoles,
  onResetPassword,
  onToggleStatus,
  onDelete,
}: UsersTableProps) {
  const t = useTranslations('users');
  const tCommon = useTranslations('common');
  const tCustomers = useTranslations('customers');
  const tDashboard = useTranslations('dashboard');
  const queryEnabled = search !== undefined;
  const { data: usersData, isLoading: isLoadingQuery } = useUsers(
    queryEnabled ? { search: search || undefined, page: 1, pageSize: 50 } : {}
  );
  const users = queryEnabled ? (usersData?.data ?? []) : (usersProp ?? []);
  const isLoading = isLoadingProp ?? (queryEnabled ? isLoadingQuery : false);
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-tertiary">
        <p className="text-lg font-medium">{t('table.empty')}</p>
        <p className="text-sm mt-1">{t('table.emptyHint')}</p>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t('table.never');
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-tertiary text-xs uppercase">
            <th className="text-left py-3 px-4">{t('table.user')}</th>
            <th className="text-left py-3 px-4">{tCustomers('email')}</th>
            <th className="text-left py-3 px-4">{t('table.roles')}</th>
            <th className="text-center py-3 px-4">{tDashboard('status')}</th>
            <th className="text-left py-3 px-4">{t('table.lastAccess')}</th>
            <th className="text-left py-3 px-4">{t('table.registered')}</th>
            <th className="text-right py-3 px-4">{tCustomers('table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium">{user.name}</p>
                  {user.phone && <p className="text-xs text-quaternary">{user.phone}</p>}
                </div>
              </td>
              <td className="py-3 px-4 text-secondary">{user.email}</td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {user.roles.length === 0 ? (
                    <span className="text-quaternary text-xs">{t('table.noRoles')}</span>
                  ) : (
                    user.roles.map((role) => (
                      <span
                        key={role.id}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ROLE_COLORS[role.name.toLowerCase()] || 'bg-gray-100 text-secondary'
                        }`}
                      >
                        {role.name}
                      </span>
                    ))
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-center">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-tertiary'
                  }`}
                >
                  {user.isActive ? tCustomers('table.active') : tCustomers('table.inactive')}
                </span>
              </td>
              <td className="py-3 px-4 text-tertiary">{formatDate(user.lastLogin)}</td>
              <td className="py-3 px-4 text-tertiary">{formatDate(user.createdAt)}</td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit?.(user)} title={tCommon('edit')}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onAssignRoles?.(user)} title={t('table.assignRoles')}>
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onResetPassword?.(user)} title={t('table.resetPassword')}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleStatus?.(user)}
                    title={user.isActive ? t('deactivate') : t('activate')}
                  >
                    {user.isActive
                      ? <ToggleRight className="h-4 w-4 text-green-600" />
                      : <ToggleLeft className="h-4 w-4 text-quaternary" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete?.(user)}
                    title={tCommon('delete')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
