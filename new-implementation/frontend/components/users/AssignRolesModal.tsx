'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRoles } from '@/hooks/useUsers';
import type { UserResponse, Role } from '@/types/users';
import { X, Shield } from 'lucide-react';

interface AssignRolesModalProps {
  user: UserResponse;
  onSubmit: (roleIds: string[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AssignRolesModal({ user, onSubmit, onCancel, isLoading }: AssignRolesModalProps) {
  const t = useTranslations('users');
  const tCommon = useTranslations('common');
  const { data: roles = [] } = useRoles();
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(user.roles.map((r) => r.id));

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('roles.assignTitle')}
            </CardTitle>
            <CardDescription>{t('roles.userLabel', { name: user.name, email: user.email })}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {roles.map((role: Role) => (
              <label
                key={role.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedRoleIds.includes(role.id)
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <p className="font-medium">{role.name}</p>
                  <p className="text-sm text-tertiary">{role.description}</p>
                </div>
                {role.isSystemRole && (
                  <span className="text-xs bg-gray-100 text-secondary px-2 py-0.5 rounded">{tCommon('system')}</span>
                )}
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={onCancel}>{tCommon('cancel')}</Button>
            <Button onClick={() => onSubmit(selectedRoleIds)} disabled={isLoading}>
              {isLoading ? tCommon('saving') : t('roles.saveRoles')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
