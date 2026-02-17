'use client';

import { useState } from 'react';
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
              Asignar Roles
            </CardTitle>
            <CardDescription>Usuario: {user.name} ({user.email})</CardDescription>
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
                  <p className="text-sm text-gray-500">{role.description}</p>
                </div>
                {role.isSystemRole && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Sistema</span>
                )}
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={() => onSubmit(selectedRoleIds)} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar roles'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
