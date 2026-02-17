import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users';
import type { UserQuery, CreateUserDto, UpdateUserDto, AssignRolesDto, ResetPasswordDto } from '@/types/users';

export const userKeys = {
  all: ['users'] as const,
  list: (q: UserQuery) => ['users', 'list', q] as const,
  stats: () => ['users', 'stats'] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  roles: () => ['users', 'roles'] as const,
};

export function useUsers(query: UserQuery = {}) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: () => usersApi.getAll(query).then((r) => r.data),
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: () => usersApi.getStats().then((r) => r.data),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getById(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles(),
    queryFn: () => usersApi.getRoles().then((r) => r.data),
    staleTime: 10 * 60 * 1000, // roles change rarely
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateUserDto) => usersApi.create(dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserDto }) =>
      usersApi.update(id, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useAssignRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AssignRolesDto }) =>
      usersApi.assignRoles(id, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useToggleUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.toggleStatus(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ResetPasswordDto }) =>
      usersApi.resetPassword(id, dto).then((r) => r.data),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}
