import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AUTH_CONSTANTS } from './constants/auth.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials
   * @returns User if valid, null otherwise
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        relations: ['roles'],
      });

      if (!user || !user.is_active) {
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        this.logger.warn(`Failed login attempt for email: ${email}`);
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`);
      return null;
    }
  }

  /**
   * Login user and return JWT tokens
   */
  async login(user: User): Promise<AuthResponseDto> {
    try {
      // Update last login timestamp
      user.last_login = new Date();
      await this.userRepository.save(user);

      // Generate access and refresh tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        accessToken,
        refreshToken,
        user: this.mapUserToResponseDto(user),
        expiresIn: 3600, // 1 hour in seconds
        tokenType: 'Bearer',
      };
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`);
      throw new UnauthorizedException(AUTH_CONSTANTS.ERRORS.UNAUTHORIZED);
    }
  }

  /**
   * Register new user (admin only)
   */
  async register(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      // Check if email already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException(AUTH_CONSTANTS.ERRORS.DUPLICATE_EMAIL);
      }

      // Validate password strength
      this.validatePasswordStrength(createUserDto.password);

      // Hash password
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        AUTH_CONSTANTS.PASSWORD.BCRYPT_ROUNDS,
      );

      // Create new user
      const user = this.userRepository.create({
        email: createUserDto.email,
        password_hash: hashedPassword,
        name: createUserDto.name,
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        phone: createUserDto.phone,
        company_id: createUserDto.company_id || null,
        is_active: true,
        roles: [],
      });

      const savedUser = await this.userRepository.save(user);

      this.logger.log(`New user registered: ${savedUser.email}`);

      return this.mapUserToResponseDto(savedUser);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Registration error: ${error.message}`);
      throw new BadRequestException('Failed to register user');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: AUTH_CONSTANTS.JWT.SECRET_KEY,
      });

      // Get user from database
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['roles'],
      });

      if (!user || !user.is_active) {
        throw new UnauthorizedException(
          AUTH_CONSTANTS.ERRORS.REFRESH_TOKEN_EXPIRED,
        );
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: this.mapUserToResponseDto(user),
        expiresIn: 3600,
        tokenType: 'Bearer',
      };
    } catch (error) {
      this.logger.error(`Token refresh error: ${error.message}`);
      throw new UnauthorizedException(
        AUTH_CONSTANTS.ERRORS.REFRESH_TOKEN_EXPIRED,
      );
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    try {
      // Get user from database
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(AUTH_CONSTANTS.ERRORS.USER_NOT_FOUND);
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        changePasswordDto.oldPassword,
        user.password_hash,
      );

      if (!isPasswordValid) {
        throw new BadRequestException(
          AUTH_CONSTANTS.ERRORS.PASSWORD_MISMATCH,
        );
      }

      // Verify new passwords match
      if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      // Validate new password strength
      this.validatePasswordStrength(changePasswordDto.newPassword);

      // Hash new password
      const hashedPassword = await bcrypt.hash(
        changePasswordDto.newPassword,
        AUTH_CONSTANTS.PASSWORD.BCRYPT_ROUNDS,
      );

      // Update password
      user.password_hash = hashedPassword;
      await this.userRepository.save(user);

      this.logger.log(`Password changed for user: ${user.email}`);

      return { message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Change password error: ${error.message}`);
      throw new BadRequestException('Failed to change password');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });
    } catch (error) {
      this.logger.error(`Error fetching user: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { email },
        relations: ['roles'],
      });
    } catch (error) {
      this.logger.error(`Error fetching user by email: ${error.message}`);
      return null;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUserProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new NotFoundException(AUTH_CONSTANTS.ERRORS.USER_NOT_FOUND);
    }

    return this.mapUserToResponseDto(user);
  }

  /**
   * Logout (token invalidation would be handled by storing in blacklist)
   * For simplicity, we just return success message
   */
  async logout(userId: string): Promise<{ message: string }> {
    this.logger.log(`User logged out: ${userId}`);
    // In production, you might want to store the token in a blacklist
    // For now, we rely on JWT expiration
    return { message: 'Logged out successfully' };
  }

  /**
   * Generate access token
   */
  private generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.getRoleNames(),
    };

    return this.jwtService.sign(payload, {
      secret: AUTH_CONSTANTS.JWT.SECRET_KEY,
      expiresIn: AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
      type: AUTH_CONSTANTS.TOKEN_TYPE.REFRESH,
    };

    return this.jwtService.sign(payload, {
      secret: AUTH_CONSTANTS.JWT.SECRET_KEY,
      expiresIn: AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    const errors: string[] = [];

    if (password.length < AUTH_CONSTANTS.PASSWORD.MIN_LENGTH) {
      errors.push(
        `at least ${AUTH_CONSTANTS.PASSWORD.MIN_LENGTH} characters`,
      );
    }

    if (AUTH_CONSTANTS.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('at least one uppercase letter');
    }

    if (AUTH_CONSTANTS.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('at least one lowercase letter');
    }

    if (AUTH_CONSTANTS.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push('at least one number');
    }

    if (
      AUTH_CONSTANTS.PASSWORD.REQUIRE_SPECIAL_CHARS &&
      !/[@$!%*?&]/.test(password)
    ) {
      errors.push('at least one special character (@$!%*?&)');
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Password must contain: ${errors.join(', ')}`,
      );
    }
  }

  /**
   * Map user entity to response DTO
   */
  private mapUserToResponseDto(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.first_name = user.first_name;
    dto.last_name = user.last_name;
    dto.phone = user.phone;
    dto.company_id = user.company_id;
    dto.is_active = user.is_active;
    dto.last_login = user.last_login;
    dto.roles = user.getRoleNames();
    dto.created_at = user.created_at;
    dto.updated_at = user.updated_at;

    return dto;
  }
}
