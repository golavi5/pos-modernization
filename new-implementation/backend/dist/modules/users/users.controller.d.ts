import { UsersService } from './services/users.service';
import { AdminCreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto, AssignRolesDto, AdminResetPasswordDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto, UserListResponseDto, UserStatsDto, RoleResponseDto } from './dto/user-response.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(user: any, query: UserQueryDto): Promise<UserListResponseDto>;
    getStats(user: any): Promise<UserStatsDto>;
    findById(id: string, user: any): Promise<UserResponseDto>;
    create(currentUser: any, dto: AdminCreateUserDto): Promise<UserResponseDto>;
    update(id: string, user: any, dto: AdminUpdateUserDto): Promise<UserResponseDto>;
    assignRoles(id: string, user: any, dto: AssignRolesDto): Promise<UserResponseDto>;
    toggleStatus(id: string, user: any): Promise<UserResponseDto>;
    resetPassword(id: string, user: any, dto: AdminResetPasswordDto): Promise<{
        message: string;
    }>;
    remove(id: string, user: any): Promise<{
        message: string;
    }>;
    getRoles(user: any): Promise<RoleResponseDto[]>;
}
