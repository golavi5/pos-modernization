export declare class AdminUpdateUserDto {
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    isActive?: boolean;
}
export declare class AssignRolesDto {
    roleIds: string[];
}
export declare class AdminResetPasswordDto {
    newPassword: string;
    forceChangeOnLogin?: boolean;
}
