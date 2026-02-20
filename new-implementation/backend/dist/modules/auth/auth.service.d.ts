import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
export declare class AuthService {
    private userRepository;
    private jwtService;
    private readonly logger;
    constructor(userRepository: Repository<User>, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<User | null>;
    login(user: User): Promise<AuthResponseDto>;
    register(createUserDto: CreateUserDto): Promise<UserResponseDto>;
    refreshToken(refreshToken: string): Promise<AuthResponseDto>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getUserById(userId: string): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    getCurrentUserProfile(userId: string): Promise<UserResponseDto>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    private generateAccessToken;
    private generateRefreshToken;
    private validatePasswordStrength;
    private mapUserToResponseDto;
}
