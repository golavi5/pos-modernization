import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Role } from '../../auth/entities/role.entity';
import { AdminCreateUserDto } from '../dto/create-user.dto';
import { AdminUpdateUserDto, AssignRolesDto, AdminResetPasswordDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { UserResponseDto, UserListResponseDto, UserStatsDto, RoleResponseDto } from '../dto/user-response.dto';
export declare class UsersService {
    private readonly userRepository;
    private readonly roleRepository;
    private readonly logger;
    constructor(userRepository: Repository<User>, roleRepository: Repository<Role>);
    findAll(companyId: string, query: UserQueryDto): Promise<UserListResponseDto>;
    findById(id: string, companyId: string): Promise<UserResponseDto>;
    create(companyId: string, dto: AdminCreateUserDto): Promise<UserResponseDto>;
    update(id: string, companyId: string, dto: AdminUpdateUserDto): Promise<UserResponseDto>;
    assignRoles(id: string, companyId: string, dto: AssignRolesDto): Promise<UserResponseDto>;
    toggleStatus(id: string, companyId: string, requesterId: string): Promise<UserResponseDto>;
    resetPassword(id: string, companyId: string, dto: AdminResetPasswordDto): Promise<{
        message: string;
    }>;
    remove(id: string, companyId: string, requesterId: string): Promise<{
        message: string;
    }>;
    getStats(companyId: string): Promise<UserStatsDto>;
    getRoles(companyId: string): Promise<RoleResponseDto[]>;
    private findUserOrFail;
    private mapToResponse;
}
