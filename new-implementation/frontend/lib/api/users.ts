import { apiClient } from './client';
import type {
  UserResponse,
  UserListResponse,
  UserStats,
  UserQuery,
  CreateUserDto,
  UpdateUserDto,
  AssignRolesDto,
  ResetPasswordDto,
  Role,
} from '@/types/users';

const BASE = '/users';

export const usersApi = {
  // Users CRUD
  getAll: (query: UserQuery = {}) =>
    apiClient.get<UserListResponse>(BASE, { params: query }),

  getStats: () =>
    apiClient.get<UserStats>(`${BASE}/stats`),

  getById: (id: string) =>
    apiClient.get<UserResponse>(`${BASE}/${id}`),

  create: (dto: CreateUserDto) =>
    apiClient.post<UserResponse>(BASE, dto),

  update: (id: string, dto: UpdateUserDto) =>
    apiClient.patch<UserResponse>(`${BASE}/${id}`, dto),

  assignRoles: (id: string, dto: AssignRolesDto) =>
    apiClient.patch<UserResponse>(`${BASE}/${id}/roles`, dto),

  toggleStatus: (id: string) =>
    apiClient.patch<UserResponse>(`${BASE}/${id}/toggle-status`),

  resetPassword: (id: string, dto: ResetPasswordDto) =>
    apiClient.patch<{ message: string }>(`${BASE}/${id}/reset-password`, dto),

  remove: (id: string) =>
    apiClient.delete<{ message: string }>(`${BASE}/${id}`),

  // Roles
  getRoles: () =>
    apiClient.get<Role[]>(`${BASE}/roles/list`),
};
