'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlideOver } from '@/components/ui/slide-over';
import { UsersTable } from '@/components/users/UsersTable';
import { UserForm } from '@/components/users/UserForm';
import { AssignRolesModal } from '@/components/users/AssignRolesModal';
import { ResetPasswordModal } from '@/components/users/ResetPasswordModal';
import {
  useAssignRoles,
  useToggleUserStatus,
  useResetPassword,
  useDeleteUser,
} from '@/hooks/useUsers';
import type { UserResponse } from '@/types/users';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [slideOver, setSlideOver] = useState<'closed' | 'new' | 'edit'>('closed');
  const [editTarget, setEditTarget] = useState<UserResponse | null>(null);
  const [assignRolesTarget, setAssignRolesTarget] = useState<UserResponse | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserResponse | null>(null);

  const assignRoles = useAssignRoles();
  const toggleStatus = useToggleUserStatus();
  const resetPassword = useResetPassword();
  const deleteUser = useDeleteUser();

  const openNew = () => { setEditTarget(null); setSlideOver('new'); };
  const openEdit = (user: UserResponse) => { setEditTarget(user); setSlideOver('edit'); };
  const close = () => setSlideOver('closed');

  const handleAssignRoles = async (roleIds: string[]) => {
    if (!assignRolesTarget) return;
    try {
      await assignRoles.mutateAsync({ id: assignRolesTarget.id, dto: { roleIds } });
      setAssignRolesTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resetPasswordTarget) return;
    try {
      await resetPassword.mutateAsync({ id: resetPasswordTarget.id, dto: { newPassword } });
      setResetPasswordTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (user: UserResponse) => {
    if (confirm(`¿${user.isActive ? 'Desactivar' : 'Activar'} usuario "${user.name}"?`)) {
      await toggleStatus.mutateAsync(user.id);
    }
  };

  const handleDelete = async (user: UserResponse) => {
    if (confirm(`¿Eliminar usuario "${user.name}"? Esta acción no se puede deshacer.`)) {
      await deleteUser.mutateAsync(user.id);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuarios..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex-1" />
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus size={14} /> Nuevo usuario
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <UsersTable
          search={search}
          onEdit={openEdit}
          onAssignRoles={setAssignRolesTarget}
          onResetPassword={setResetPasswordTarget}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      </div>

      {/* Slide-over */}
      <SlideOver
        open={slideOver !== 'closed'}
        onClose={close}
        title={slideOver === 'new' ? 'Nuevo usuario' : 'Editar usuario'}
        footer={
          <>
            <Button variant="outline" onClick={close} className="flex-1">Cancelar</Button>
            <Button form="user-form" type="submit" className="flex-1">Guardar</Button>
          </>
        }
      >
        <UserForm
          user={editTarget}
          formId="user-form"
          onSuccess={close}
        />
      </SlideOver>

      {/* Assign Roles Modal */}
      {assignRolesTarget && (
        <AssignRolesModal
          user={assignRolesTarget}
          onSubmit={handleAssignRoles}
          onCancel={() => setAssignRolesTarget(null)}
          isLoading={assignRoles.isPending}
        />
      )}

      {/* Reset Password Modal */}
      {resetPasswordTarget && (
        <ResetPasswordModal
          user={resetPasswordTarget}
          onSubmit={handleResetPassword}
          onCancel={() => setResetPasswordTarget(null)}
          isLoading={resetPassword.isPending}
        />
      )}
    </div>
  );
}
