export declare class RoleResponseDto {
    id: string;
    name: string;
    description: string;
    isSystemRole: boolean;
}
export declare class UserResponseDto {
    id: string;
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    isActive: boolean;
    lastLogin?: Date;
    roles: RoleResponseDto[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class UserListResponseDto {
    data: UserResponseDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export declare class UserStatsDto {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    newUsersThisMonth: number;
    usersLoggedInLast30Days: number;
    usersByRole: {
        roleName: string;
        count: number;
    }[];
}
