import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, Between } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../auth/entities/user.entity';
import { Role } from '../../auth/entities/role.entity';
import { AdminCreateUserDto } from '../dto/create-user.dto';
import { AdminUpdateUserDto, AssignRolesDto, AdminResetPasswordDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import {
  UserResponseDto,
  UserListResponseDto,
  UserStatsDto,
  RoleResponseDto,
} from '../dto/user-response.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * Get paginated list of users
   */
  async findAll(companyId: string, query: UserQueryDto): Promise<UserListResponseDto> {
    const { search, role, isActive, sortBy, sortOrder, page, pageSize } = query;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('user.deleted_at IS NULL');

    if (search) {
      qb.andWhere(
        '(user.name LIKE :search OR user.email LIKE :search OR user.first_name LIKE :search OR user.last_name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      qb.andWhere('user.is_active = :isActive', { isActive });
    }

    if (role) {
      qb.andWhere('role.name = :role', { role });
    }

    const validSortFields: Record<string, string> = {
      name: 'user.name',
      email: 'user.email',
      created_at: 'user.created_at',
      last_login: 'user.last_login',
    };

    const sortField = validSortFields[sortBy] || 'user.created_at';
    qb.orderBy(sortField, sortOrder || 'DESC');

    const offset = ((page || 1) - 1) * (pageSize || 20);
    qb.skip(offset).take(pageSize || 20);

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((u) => this.mapToResponse(u)),
      total,
      page: page || 1,
      pageSize: pageSize || 20,
      totalPages: Math.ceil(total / (pageSize || 20)),
    };
  }

  /**
   * Get single user by ID
   */
  async findById(id: string, companyId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id, company_id: companyId },
      relations: ['roles'],
    });

    if (!user || user.deleted_at) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapToResponse(user);
  }

  /**
   * Create a new user (admin)
   */
  async create(companyId: string, dto: AdminCreateUserDto): Promise<UserResponseDto> {
    // Check email uniqueness
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(`Email ${dto.email} is already in use`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Resolve roles
    let roles: Role[] = [];
    if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await this.roleRepository.findBy({ id: In(dto.roleIds) });
    }

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password_hash: passwordHash,
      first_name: dto.firstName,
      last_name: dto.lastName,
      phone: dto.phone,
      company_id: companyId,
      is_active: dto.isActive ?? true,
      roles,
    });

    const saved = await this.userRepository.save(user);
    this.logger.log(`Created user ${saved.id} (${saved.email}) in company ${companyId}`);

    return this.mapToResponse(saved);
  }

  /**
   * Update user details
   */
  async update(id: string, companyId: string, dto: AdminUpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findUserOrFail(id, companyId);

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.firstName !== undefined) user.first_name = dto.firstName;
    if (dto.lastName !== undefined) user.last_name = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.isActive !== undefined) user.is_active = dto.isActive;

    const saved = await this.userRepository.save(user);
    this.logger.log(`Updated user ${id} in company ${companyId}`);

    return this.mapToResponse(saved);
  }

  /**
   * Assign roles to user (replaces existing)
   */
  async assignRoles(id: string, companyId: string, dto: AssignRolesDto): Promise<UserResponseDto> {
    const user = await this.findUserOrFail(id, companyId);

    const roles = await this.roleRepository.findBy({ id: In(dto.roleIds) });

    if (roles.length !== dto.roleIds.length) {
      const found = roles.map((r) => r.id);
      const missing = dto.roleIds.filter((rid) => !found.includes(rid));
      throw new NotFoundException(`Roles not found: ${missing.join(', ')}`);
    }

    user.roles = roles;
    const saved = await this.userRepository.save(user);
    this.logger.log(`Assigned roles to user ${id}: ${roles.map((r) => r.name).join(', ')}`);

    return this.mapToResponse(saved);
  }

  /**
   * Toggle user active status
   */
  async toggleStatus(id: string, companyId: string, requesterId: string): Promise<UserResponseDto> {
    if (id === requesterId) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    const user = await this.findUserOrFail(id, companyId);
    user.is_active = !user.is_active;

    const saved = await this.userRepository.save(user);
    this.logger.log(`User ${id} status toggled to ${saved.is_active ? 'active' : 'inactive'}`);

    return this.mapToResponse(saved);
  }

  /**
   * Admin reset user password
   */
  async resetPassword(
    id: string,
    companyId: string,
    dto: AdminResetPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.findUserOrFail(id, companyId);

    user.password_hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    this.logger.log(`Password reset for user ${id} by admin`);

    return { message: 'Password reset successfully' };
  }

  /**
   * Soft delete user
   */
  async remove(id: string, companyId: string, requesterId: string): Promise<{ message: string }> {
    if (id === requesterId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const user = await this.findUserOrFail(id, companyId);
    user.deleted_at = new Date();
    user.is_active = false;

    await this.userRepository.save(user);
    this.logger.log(`User ${id} soft-deleted from company ${companyId}`);

    return { message: 'User deleted successfully' };
  }

  /**
   * Get user statistics
   */
  async getStats(companyId: string): Promise<UserStatsDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalUsers = await this.userRepository.count({
      where: { company_id: companyId, deleted_at: null },
    });

    const activeUsers = await this.userRepository.count({
      where: { company_id: companyId, is_active: true, deleted_at: null },
    });

    const newUsersThisMonth = await this.userRepository
      .createQueryBuilder('user')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('user.deleted_at IS NULL')
      .andWhere('user.created_at >= :startOfMonth', { startOfMonth })
      .getCount();

    const recentlyActive = await this.userRepository
      .createQueryBuilder('user')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('user.deleted_at IS NULL')
      .andWhere('user.last_login >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getCount();

    // Users by role
    const roleStats = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .select('role.name', 'roleName')
      .addSelect('COUNT(DISTINCT user.id)', 'count')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('user.deleted_at IS NULL')
      .groupBy('role.name')
      .getRawMany();

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      newUsersThisMonth,
      usersLoggedInLast30Days: recentlyActive,
      usersByRole: roleStats.map((r) => ({
        roleName: r.roleName,
        count: parseInt(r.count),
      })),
    };
  }

  /**
   * Get all available roles for the company
   */
  async getRoles(companyId: string): Promise<RoleResponseDto[]> {
    const roles = await this.roleRepository.find({
      where: [{ company_id: companyId }, { is_system_role: true }],
      order: { name: 'ASC' },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystemRole: r.is_system_role,
    }));
  }

  // ==============================
  // Private helpers
  // ==============================

  private async findUserOrFail(id: string, companyId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, company_id: companyId },
      relations: ['roles'],
    });

    if (!user || user.deleted_at) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  private mapToResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      isActive: user.is_active,
      lastLogin: user.last_login,
      roles: (user.roles || []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystemRole: r.is_system_role,
      })),
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
