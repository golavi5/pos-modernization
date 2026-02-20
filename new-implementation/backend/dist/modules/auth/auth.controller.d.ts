import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
export declare class AuthController {
    private readonly authService;
    private readonly logger;
    constructor(authService: AuthService);
    login(req: any, loginDto: LoginDto): Promise<AuthResponseDto>;
    logout(user: User): Promise<{
        message: string;
    }>;
    refresh(body: {
        refreshToken: string;
    }): Promise<AuthResponseDto>;
    register(createUserDto: CreateUserDto, admin: User): Promise<UserResponseDto>;
    getCurrentUser(user: User): Promise<UserResponseDto>;
    changePassword(user: User, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    healthCheck(): {
        status: string;
        timestamp: string;
    };
}
