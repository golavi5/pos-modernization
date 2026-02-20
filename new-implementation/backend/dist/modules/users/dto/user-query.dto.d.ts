export declare enum UserSortField {
    NAME = "name",
    EMAIL = "email",
    CREATED_AT = "created_at",
    LAST_LOGIN = "last_login"
}
export declare enum SortOrder {
    ASC = "ASC",
    DESC = "DESC"
}
export declare class UserQueryDto {
    search?: string;
    role?: string;
    isActive?: boolean;
    sortBy?: UserSortField;
    sortOrder?: SortOrder;
    page?: number;
    pageSize?: number;
}
