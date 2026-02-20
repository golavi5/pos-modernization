import { User } from './user.entity';
export declare class Role {
    id: string;
    name: string;
    description: string;
    company_id: string;
    is_system_role: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
    users: User[];
    generateId(): void;
}
