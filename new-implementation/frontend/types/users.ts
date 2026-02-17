export interface Role {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  data: UserResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  usersLoggedInLast30Days: number;
  usersByRole: { roleName: string; count: number }[];
}

export interface UserQuery {
  search?: string;
  role?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'email' | 'created_at' | 'last_login';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  pageSize?: number;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  roleIds?: string[];
}

export interface UpdateUserDto {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
}

export interface AssignRolesDto {
  roleIds: string[];
}

export interface ResetPasswordDto {
  newPassword: string;
  forceChangeOnLogin?: boolean;
}
