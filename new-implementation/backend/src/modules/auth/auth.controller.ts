import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { User } from './entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * User login
   * Accepts email and password, returns JWT tokens
   */
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseGuards(AuthGuard('local'))
  async login(@Request() req, @Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      const user = req.user;
      this.logger.log(`User logged in: ${user.email}`);
      return await this.authService.login(user);
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`);
      throw new BadRequestException('Login failed');
    }
  }

  /**
   * User logout
   * Invalidates the current session
   */
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: User): Promise<{ message: string }> {
    return this.authService.logout(user.id);
  }

  /**
   * Refresh JWT token
   * Uses refresh token to generate new access token
   */
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }): Promise<AuthResponseDto> {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    return this.authService.refreshToken(body.refreshToken);
  }

  /**
   * Register new user (Admin only)
   * Creates a new user account
   */
  @ApiOperation({ summary: 'Register new user (Admin only)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Invalid user data' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async register(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() admin: User,
  ): Promise<UserResponseDto> {
    this.logger.log(
      `New user registration by admin ${admin.email}: ${createUserDto.email}`,
    );
    return this.authService.register(createUserDto);
  }

  /**
   * Get current user profile
   * Returns authenticated user's profile information
   */
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.authService.getCurrentUserProfile(user.id);
  }

  /**
   * Change user password
   * Allows authenticated user to change their password
   */
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Password change requested by user: ${user.email}`);
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  /**
   * Health check endpoint for testing
   * No authentication required
   */
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @HttpCode(HttpStatus.OK)
  @Get('health')
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
