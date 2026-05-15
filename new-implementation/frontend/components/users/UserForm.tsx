'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRoles, useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import type { UserResponse, CreateUserDto, UpdateUserDto, Role } from '@/types/users';

interface UserFormProps {
  user?: UserResponse | null;
  /** Form element id — allows an external submit button via `form={formId}` */
  formId?: string;
  /** Called after a successful create/update when using formId mode */
  onSuccess?: () => void;
  /** Legacy: called with form data (used when the page owns the mutation) */
  onSubmit?: (dto: CreateUserDto | UpdateUserDto) => void;
  /** Legacy: called on cancel */
  onCancel?: () => void;
  isLoading?: boolean;
}

export function UserForm({ user, formId, onSuccess, onSubmit, onCancel, isLoading: isLoadingProp }: UserFormProps) {
  const isEdit = !!user;
  const { data: roles = [] } = useRoles();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isLoadingInternal = createUser.isPending || updateUser.isPending;
  const isLoading = isLoadingProp ?? (formId ? isLoadingInternal : false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    isActive: true,
    roleIds: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        isActive: user.isActive,
        roleIds: user.roles.map((r) => r.id),
      });
    }
  }, [user]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'El nombre es requerido';
    if (!isEdit && !form.email.trim()) errs.email = 'El email es requerido';
    if (!isEdit && !form.password) errs.password = 'La contraseña es requerida';
    if (!isEdit && form.password.length < 8) errs.password = 'Mínimo 8 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const dto: CreateUserDto | UpdateUserDto = isEdit
      ? {
          name: form.name,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          phone: form.phone || undefined,
          isActive: form.isActive,
        } as UpdateUserDto
      : {
          name: form.name,
          email: form.email,
          password: form.password,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          phone: form.phone || undefined,
          isActive: form.isActive,
          roleIds: form.roleIds,
        } as CreateUserDto;

    if (onSubmit) {
      // Legacy mode: parent owns the mutation
      onSubmit(dto);
      return;
    }

    // formId/onSuccess mode: component owns the mutation
    try {
      if (isEdit && user) {
        await updateUser.mutateAsync({ id: user.id, dto: dto as UpdateUserDto });
      } else {
        await createUser.mutateAsync(dto as CreateUserDto);
      }
      onSuccess?.();
    } catch (err) {
      console.error('UserForm submit error:', err);
    }
  };

  const toggleRole = (roleId: string) => {
    setForm((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const field = (id: string, label: string, type = 'text', required = false) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>
      <Input
        id={id}
        type={type}
        value={(form as Record<string, unknown>)[id] as string}
        onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
        className={errors[id] ? 'border-red-500' : ''}
      />
      {errors[id] && <p className="text-xs text-red-500">{errors[id]}</p>}
    </div>
  );

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {field('name', 'Nombre completo', 'text', true)}
        {!isEdit && field('email', 'Email', 'email', true)}
        {!isEdit && field('password', 'Contraseña', 'password', true)}
        {field('firstName', 'Primer nombre')}
        {field('lastName', 'Apellido')}
        {field('phone', 'Teléfono')}
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          checked={form.isActive}
          onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          className="h-4 w-4"
        />
        <Label htmlFor="isActive">Usuario activo</Label>
      </div>

      {/* Roles (only for create) */}
      {!isEdit && roles.length > 0 && (
        <div className="space-y-2">
          <Label>Roles asignados</Label>
          <div className="grid grid-cols-1 gap-2">
            {roles.map((role: Role) => (
              <label
                key={role.id}
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                  form.roleIds.includes(role.id)
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="h-4 w-4"
                />
                <div>
                  <p className="text-sm font-medium">{role.name}</p>
                  <p className="text-xs text-tertiary">{role.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Buttons — only shown in legacy (non-formId) mode */}
      {!formId && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      )}
    </form>
  );
}
