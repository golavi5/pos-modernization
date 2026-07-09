import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { User } from '../../auth/entities/user.entity';
import { Role } from '../../auth/entities/role.entity';
import { ELEVATED_ROLES } from '../../auth/constants/elevated-roles';

function actorWithRoles(roleNames: string[]): User {
  const actor = new User();
  actor.roles = roleNames.map((name) => ({ name }) as Role);
  return actor;
}

const mockQb = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getCount: jest.fn().mockResolvedValue(0),
  getRawMany: jest.fn().mockResolvedValue([]),
});

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;

  const companyId = 'company-uuid';
  const userId = 'user-uuid';

  const mockUser: Partial<User> = {
    id: userId,
    name: 'Alice',
    email: 'alice@example.com',
    password_hash: 'hashed',
    first_name: 'Alice',
    last_name: 'Smith',
    phone: '555-0000',
    company_id: companyId,
    is_active: true,
    roles: [],
    deleted_at: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useClass: Repository },
        { provide: getRepositoryToken(Role), useClass: Repository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    roleRepo = module.get<Repository<Role>>(getRepositoryToken(Role));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const qb = mockQb();
      qb.getManyAndCount.mockResolvedValue([[mockUser as User], 1]);
      jest.spyOn(userRepo, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.findAll(companyId, {
        page: 1,
        pageSize: 20,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);

      const result = await service.findById(userId, companyId);

      expect(result.id).toBe(userId);
      expect(result.email).toBe('alice@example.com');
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findById('bad-id', companyId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for soft-deleted user', async () => {
      const deletedUser = { ...mockUser, deleted_at: new Date() } as User;
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(deletedUser);

      await expect(service.findById(userId, companyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const plainAdminActor = actorWithRoles(['admin']);
    const superadminActor = actorWithRoles(['superadmin']);

    it('should create and return a new user', async () => {
      const dto = {
        name: 'Bob',
        email: 'bob@example.com',
        password: 'secret123',
        firstName: 'Bob',
        lastName: 'Jones',
        roleIds: [],
      } as any;

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(roleRepo, 'findBy').mockResolvedValue([]);
      jest.spyOn(userRepo, 'create').mockReturnValue({
        ...mockUser,
        name: 'Bob',
        email: 'bob@example.com',
      } as User);
      jest.spyOn(userRepo, 'save').mockResolvedValue({
        ...mockUser,
        name: 'Bob',
        email: 'bob@example.com',
      } as User);

      const result = await service.create(companyId, dto, plainAdminActor);

      expect(result.name).toBe('Bob');
    });

    it('should throw ConflictException when email is already in use', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);

      await expect(
        service.create(
          companyId,
          { email: 'alice@example.com', password: 'x' } as any,
          plainAdminActor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when a non-superadmin actor tries to assign an elevated role', async () => {
      const dto = {
        name: 'Carla',
        email: 'carla@example.com',
        password: 'secret123',
        firstName: 'Carla',
        lastName: 'King',
        roleIds: ['role-superadmin'],
      } as any;

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(roleRepo, 'findBy')
        .mockResolvedValue([{ id: 'role-superadmin', name: 'superadmin' } as Role]);

      await expect(
        service.create(companyId, dto, plainAdminActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow a superadmin actor to assign an elevated role', async () => {
      const dto = {
        name: 'Carla',
        email: 'carla2@example.com',
        password: 'secret123',
        firstName: 'Carla',
        lastName: 'King',
        roleIds: ['role-superadmin'],
      } as any;

      const superadminRole = { id: 'role-superadmin', name: 'superadmin' } as Role;

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(roleRepo, 'findBy').mockResolvedValue([superadminRole]);
      jest.spyOn(userRepo, 'create').mockReturnValue({
        ...mockUser,
        name: 'Carla',
        email: 'carla2@example.com',
        roles: [superadminRole],
      } as User);
      jest.spyOn(userRepo, 'save').mockResolvedValue({
        ...mockUser,
        name: 'Carla',
        email: 'carla2@example.com',
        roles: [superadminRole],
      } as User);

      const result = await service.create(companyId, dto, superadminActor);

      expect(result.name).toBe('Carla');
      expect(result.roles.map((r) => r.name)).toContain('superadmin');
    });
  });

  describe('assignRoles — elevated role guard', () => {
    const plainAdminActor = actorWithRoles(['admin']);
    const superadminActor = actorWithRoles(['superadmin']);
    const superadminRole = { id: 'role-superadmin', name: 'superadmin' } as Role;

    it('throws ForbiddenException when a non-superadmin actor assigns an elevated role', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(roleRepo, 'findBy').mockResolvedValue([superadminRole]);

      await expect(
        service.assignRoles(
          userId,
          companyId,
          { roleIds: ['role-superadmin'] } as any,
          plainAdminActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a superadmin actor to assign an elevated role', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(roleRepo, 'findBy').mockResolvedValue([superadminRole]);
      jest.spyOn(userRepo, 'save').mockResolvedValue({
        ...mockUser,
        roles: [superadminRole],
      } as User);

      const result = await service.assignRoles(
        userId,
        companyId,
        { roleIds: ['role-superadmin'] } as any,
        superadminActor,
      );

      expect(result.roles.map((r) => r.name)).toContain('superadmin');
    });
  });

  describe('getRoles — elevated role visibility', () => {
    const plainAdminActor = actorWithRoles(['admin']);
    const superadminActor = actorWithRoles(['superadmin']);
    const allRoles = [
      { id: 'role-admin', name: 'admin', description: '', is_system_role: true },
      { id: 'role-superadmin', name: 'superadmin', description: '', is_system_role: true },
    ] as Role[];

    it('excludes elevated roles for a non-superadmin actor', async () => {
      jest.spyOn(roleRepo, 'find').mockResolvedValue(allRoles);

      const result = await service.getRoles(companyId, plainAdminActor);
      const names = result.map((r) => r.name);

      for (const elevated of ELEVATED_ROLES) {
        expect(names).not.toContain(elevated);
      }
      expect(names).toContain('admin');
    });

    it('includes elevated roles for a superadmin actor', async () => {
      jest.spyOn(roleRepo, 'find').mockResolvedValue(allRoles);

      const result = await service.getRoles(companyId, superadminActor);
      const names = result.map((r) => r.name);

      for (const elevated of ELEVATED_ROLES) {
        expect(names).toContain(elevated);
      }
    });
  });

  describe('toggleStatus', () => {
    it('should throw ForbiddenException when toggling own account', async () => {
      await expect(
        service.toggleStatus(userId, companyId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should toggle is_active for another user', async () => {
      const otherUser = { ...mockUser, id: 'other-uuid', is_active: true } as User;
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(otherUser);
      jest.spyOn(userRepo, 'save').mockResolvedValue({ ...otherUser, is_active: false } as User);

      const result = await service.toggleStatus('other-uuid', companyId, userId);

      expect(result.isActive).toBe(false);
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException when deleting own account', async () => {
      await expect(service.remove(userId, companyId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should soft-delete another user', async () => {
      const otherUser = { ...mockUser, id: 'other-uuid' } as User;
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(otherUser);
      jest.spyOn(userRepo, 'save').mockResolvedValue({
        ...otherUser,
        is_active: false,
        deleted_at: new Date(),
      } as User);

      const result = await service.remove('other-uuid', companyId, userId);

      expect(result.message).toBe('User deleted successfully');
    });
  });
});
