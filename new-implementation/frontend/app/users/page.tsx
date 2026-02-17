'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UsersTable } from '@/components/users/UsersTable';
import { UserForm } from '@/components/users/UserForm';
import { AssignRolesModal } from '@/components/users/AssignRolesModal';
import { ResetPasswordModal } from '@/components/users/ResetPasswordModal';
import {
  useUsers,
  useUserStats,
  useCreateUser,
  useUpdateUser,
  useAssignRoles,
  useToggleUserStatus,
  useResetPassword,
  useDeleteUser,
} from '@/hooks/useUsers';
import type { UserResponse, UserQuery, CreateUserDto, UpdateUserDto } from '@/types/users';
import { Users, UserPlus, UserCheck, UserX, Search } from 'lucide-react';

type ModalType = 'create' | 'edit' | 'assign-roles' | 'reset-password' | null;

export default function UsersPage() {
  const [query, setQuery] = useState<UserQuery>({ page: 1, pageSize: 20 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const { data: usersData, isLoading } = useUsers(query);
  const { data: stats } = useUserStats();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const assignRoles = useAssignRoles();
  const toggleStatus = useToggleUserStatus();
  const resetPassword = useResetPassword();
  const deleteUser = useDeleteUser();

  const handleSearch = () => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: search || undefined,
      role: roleFilter || undefined,
      isActive: statusFilter === '' ? undefined : statusFilter === 'active',
    }));
  };

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setQuery({ page: 1, pageSize: 20 });
  };

  const openCreate = () => { setSelectedUser(null); setModal('create'); };
  const openEdit = (user: UserResponse) => { setSelectedUser(user); setModal('edit'); };
  const openAssignRoles = (user: UserResponse) => { setSelectedUser(user); setModal('assign-roles'); };
  const openResetPassword = (user: UserResponse) => { setSelectedUser(user); setModal('reset-password'); };
  const closeModal = () => { setModal(null); setSelectedUser(null); };

  const handleCreate = async (dto: CreateUserDto | UpdateUserDto) => {
    await createUser.mutateAsync(dto as CreateUserDto);
    closeModal();
  };

  const handleUpdate = async (dto: CreateUserDto | UpdateUserDto) => {
    if (!selectedUser) return;
    await updateUser.mutateAsync({ id: selectedUser.id, dto: dto as UpdateUserDto });
    closeModal();
  };

  const handleAssignRoles = async (roleIds: string[]) => {
    if (!selectedUser) return;
    await assignRoles.mutateAsync({ id: selectedUser.id, dto: { roleIds } });
    closeModal();
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!selectedUser) return;
    await resetPassword.mutateAsync({ id: selectedUser.id, dto: { newPassword } });
    closeModal();
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

  const handlePageChange = (newPage: number) => {
    setQuery((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">Administra usuarios, roles y permisos del sistema</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Activos</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Inactivos</CardTitle>
              <UserX className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{stats.inactiveUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Nuevos (mes)</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.newUsersThisMonth}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Roles summary */}
      {stats && stats.usersByRole.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {stats.usersByRole.map((r) => (
            <div key={r.roleName} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
              <span className="font-medium">{r.roleName}</span>
              <span className="text-gray-500">{r.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="cashier">Cashier</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1">Buscar</Button>
              <Button variant="outline" onClick={handleResetFilters}>Limpiar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          <UsersTable
            users={usersData?.data || []}
            isLoading={isLoading}
            onEdit={openEdit}
            onAssignRoles={openAssignRoles}
            onResetPassword={openResetPassword}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />

          {/* Pagination */}
          {usersData && usersData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                {usersData.total} usuarios · Página {usersData.page} de {usersData.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={usersData.page <= 1}
                  onClick={() => handlePageChange(usersData.page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={usersData.page >= usersData.totalPages}
                  onClick={() => handlePageChange(usersData.page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {modal === 'create' && (
        <UserForm
          onSubmit={handleCreate}
          onCancel={closeModal}
          isLoading={createUser.isPending}
        />
      )}
      {modal === 'edit' && selectedUser && (
        <UserForm
          user={selectedUser}
          onSubmit={handleUpdate}
          onCancel={closeModal}
          isLoading={updateUser.isPending}
        />
      )}
      {modal === 'assign-roles' && selectedUser && (
        <AssignRolesModal
          user={selectedUser}
          onSubmit={handleAssignRoles}
          onCancel={closeModal}
          isLoading={assignRoles.isPending}
        />
      )}
      {modal === 'reset-password' && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onSubmit={handleResetPassword}
          onCancel={closeModal}
          isLoading={resetPassword.isPending}
        />
      )}
    </div>
  );
}
