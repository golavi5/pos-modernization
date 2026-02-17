import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './services/users.service';
import { AdminCreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto, AssignRolesDto, AdminResetPasswordDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import {
  UserResponseDto,
  UserListResponseDto,
  UserStatsDto,
  RoleResponseDto,
} from './dto/user-response.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== USERS ====================

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({ status: 200, type: UserListResponseDto })
  async findAll(
    @CurrentUser() user: any,
    @Query() query: UserQueryDto,
  ): Promise<UserListResponseDto> {
    return this.usersService.findAll(user.companyId, query);
  }

  @Get('stats')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, type: UserStatsDto })
  async getStats(@CurrentUser() user: any): Promise<UserStatsDto> {
    return this.usersService.getStats(user.companyId);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<UserResponseDto> {
    return this.usersService.findById(id, user.companyId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create new user (admin only)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async create(
    @CurrentUser() currentUser: any,
    @Body() dto: AdminCreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(currentUser.companyId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, user.companyId, dto);
  }

  @Patch(':id/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign roles to user (admin only)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: AssignRolesDto,
  ): Promise<UserResponseDto> {
    return this.usersService.assignRoles(id, user.companyId, dto);
  }

  @Patch(':id/toggle-status')
  @Roles('admin')
  @ApiOperation({ summary: 'Toggle user active/inactive status (admin only)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<UserResponseDto> {
    return this.usersService.toggleStatus(id, user.companyId, user.id);
  }

  @Patch(':id/reset-password')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin reset user password (admin only)' })
  @ApiResponse({ status: 200 })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: AdminResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.usersService.resetPassword(id, user.companyId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete user (admin only)' })
  @ApiResponse({ status: 200 })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    return this.usersService.remove(id, user.companyId, user.id);
  }

  // ==================== ROLES ====================

  @Get('roles/list')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get all available roles' })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  async getRoles(@CurrentUser() user: any): Promise<RoleResponseDto[]> {
    return this.usersService.getRoles(user.companyId);
  }
}
