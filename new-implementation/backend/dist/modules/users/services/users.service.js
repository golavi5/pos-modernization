"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const user_entity_1 = require("../../auth/entities/user.entity");
const role_entity_1 = require("../../auth/entities/role.entity");
let UsersService = UsersService_1 = class UsersService {
    constructor(userRepository, roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    async findAll(companyId, query) {
        const { search, role, isActive, sortBy, sortOrder, page, pageSize } = query;
        const qb = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.roles', 'role')
            .where('user.company_id = :companyId', { companyId })
            .andWhere('user.deleted_at IS NULL');
        if (search) {
            qb.andWhere('(user.name LIKE :search OR user.email LIKE :search OR user.first_name LIKE :search OR user.last_name LIKE :search)', { search: `%${search}%` });
        }
        if (isActive !== undefined) {
            qb.andWhere('user.is_active = :isActive', { isActive });
        }
        if (role) {
            qb.andWhere('role.name = :role', { role });
        }
        const validSortFields = {
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
    async findById(id, companyId) {
        const user = await this.userRepository.findOne({
            where: { id, company_id: companyId },
            relations: ['roles'],
        });
        if (!user || user.deleted_at) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return this.mapToResponse(user);
    }
    async create(companyId, dto) {
        const existing = await this.userRepository.findOne({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException(`Email ${dto.email} is already in use`);
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        let roles = [];
        if (dto.roleIds && dto.roleIds.length > 0) {
            roles = await this.roleRepository.findBy({ id: (0, typeorm_2.In)(dto.roleIds) });
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
    async update(id, companyId, dto) {
        const user = await this.findUserOrFail(id, companyId);
        if (dto.name !== undefined)
            user.name = dto.name;
        if (dto.firstName !== undefined)
            user.first_name = dto.firstName;
        if (dto.lastName !== undefined)
            user.last_name = dto.lastName;
        if (dto.phone !== undefined)
            user.phone = dto.phone;
        if (dto.isActive !== undefined)
            user.is_active = dto.isActive;
        const saved = await this.userRepository.save(user);
        this.logger.log(`Updated user ${id} in company ${companyId}`);
        return this.mapToResponse(saved);
    }
    async assignRoles(id, companyId, dto) {
        const user = await this.findUserOrFail(id, companyId);
        const roles = await this.roleRepository.findBy({ id: (0, typeorm_2.In)(dto.roleIds) });
        if (roles.length !== dto.roleIds.length) {
            const found = roles.map((r) => r.id);
            const missing = dto.roleIds.filter((rid) => !found.includes(rid));
            throw new common_1.NotFoundException(`Roles not found: ${missing.join(', ')}`);
        }
        user.roles = roles;
        const saved = await this.userRepository.save(user);
        this.logger.log(`Assigned roles to user ${id}: ${roles.map((r) => r.name).join(', ')}`);
        return this.mapToResponse(saved);
    }
    async toggleStatus(id, companyId, requesterId) {
        if (id === requesterId) {
            throw new common_1.ForbiddenException('Cannot deactivate your own account');
        }
        const user = await this.findUserOrFail(id, companyId);
        user.is_active = !user.is_active;
        const saved = await this.userRepository.save(user);
        this.logger.log(`User ${id} status toggled to ${saved.is_active ? 'active' : 'inactive'}`);
        return this.mapToResponse(saved);
    }
    async resetPassword(id, companyId, dto) {
        const user = await this.findUserOrFail(id, companyId);
        user.password_hash = await bcrypt.hash(dto.newPassword, 10);
        await this.userRepository.save(user);
        this.logger.log(`Password reset for user ${id} by admin`);
        return { message: 'Password reset successfully' };
    }
    async remove(id, companyId, requesterId) {
        if (id === requesterId) {
            throw new common_1.ForbiddenException('Cannot delete your own account');
        }
        const user = await this.findUserOrFail(id, companyId);
        user.deleted_at = new Date();
        user.is_active = false;
        await this.userRepository.save(user);
        this.logger.log(`User ${id} soft-deleted from company ${companyId}`);
        return { message: 'User deleted successfully' };
    }
    async getStats(companyId) {
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
    async getRoles(companyId) {
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
    async findUserOrFail(id, companyId) {
        const user = await this.userRepository.findOne({
            where: { id, company_id: companyId },
            relations: ['roles'],
        });
        if (!user || user.deleted_at) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    mapToResponse(user) {
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map