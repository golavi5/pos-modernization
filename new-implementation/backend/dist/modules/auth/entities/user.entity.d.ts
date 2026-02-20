import { Role } from './role.entity';
import { Order } from '../../sales/entities/order.entity';
export declare class User {
    id: string;
    email: string;
    password_hash: string;
    name: string;
    first_name: string;
    last_name: string;
    phone: string;
    company_id: string;
    is_active: boolean;
    last_login: Date;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
    roles: Role[];
    orders: Order[];
    generateId(): void;
    getRoleNames(): string[];
    hasRole(roleName: string): boolean;
    hasAnyRole(roleNames: string[]): boolean;
    hasAllRoles(roleNames: string[]): boolean;
}
