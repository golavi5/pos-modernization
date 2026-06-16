import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../services/users.service';
import { User } from '../../auth/entities/user.entity';
import { AdminCreateUserDto } from '../dto/create-user.dto';
import { AdminUpdateUserDto, AssignRolesDto, AdminResetPasswordDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';

/**
 * Tenant-scoping regression guard (B-01).
 *
 * The entity field is `company_id`; the JWT strategy injects the full User
 * entity. A previous bug read `user.companyId` (undefined) which made TypeORM
 * drop the WHERE clause and return *all tenants'* rows. These tests assert the
 * controller forwards the real `company_id` to the service on every route — so
 * reverting to `user.companyId` (now `undefined`) fails loudly.
 */
describe('UsersController (tenant scoping)', () => {
  let controller: UsersController;

  const mockCompanyId = 'company-123';

  // Shaped like the injected User: `company_id` is set, the wrong-cased
  // `companyId` is intentionally undefined.
  const mockUser = {
    id: 'user-1',
    company_id: mockCompanyId,
    is_active: true,
  } as unknown as User;

  const mockService = {
    findAll: jest.fn(),
    getStats: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    assignRoles: jest.fn(),
    toggleStatus: jest.fn(),
    resetPassword: jest.fn(),
    remove: jest.fn(),
    getRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => jest.clearAllMocks());

  it('forwards company_id to findAll', async () => {
    const query = {} as UserQueryDto;
    await controller.findAll(mockUser, query);
    expect(mockService.findAll).toHaveBeenCalledWith(mockCompanyId, query);
  });

  it('forwards company_id to getStats', async () => {
    await controller.getStats(mockUser);
    expect(mockService.getStats).toHaveBeenCalledWith(mockCompanyId);
  });

  it('forwards company_id to findById', async () => {
    await controller.findById('target-id', mockUser);
    expect(mockService.findById).toHaveBeenCalledWith('target-id', mockCompanyId);
  });

  it('forwards company_id to create (was the missed `currentUser.companyId` path)', async () => {
    const dto = {} as AdminCreateUserDto;
    await controller.create(mockUser, dto);
    expect(mockService.create).toHaveBeenCalledWith(mockCompanyId, dto);
  });

  it('forwards company_id to update', async () => {
    const dto = {} as AdminUpdateUserDto;
    await controller.update('target-id', mockUser, dto);
    expect(mockService.update).toHaveBeenCalledWith('target-id', mockCompanyId, dto);
  });

  it('forwards company_id to assignRoles', async () => {
    const dto = {} as AssignRolesDto;
    await controller.assignRoles('target-id', mockUser, dto);
    expect(mockService.assignRoles).toHaveBeenCalledWith('target-id', mockCompanyId, dto);
  });

  it('forwards company_id to toggleStatus', async () => {
    await controller.toggleStatus('target-id', mockUser);
    expect(mockService.toggleStatus).toHaveBeenCalledWith('target-id', mockCompanyId, mockUser.id);
  });

  it('forwards company_id to resetPassword', async () => {
    const dto = {} as AdminResetPasswordDto;
    await controller.resetPassword('target-id', mockUser, dto);
    expect(mockService.resetPassword).toHaveBeenCalledWith('target-id', mockCompanyId, dto);
  });

  it('forwards company_id to remove', async () => {
    await controller.remove('target-id', mockUser);
    expect(mockService.remove).toHaveBeenCalledWith('target-id', mockCompanyId, mockUser.id);
  });

  it('forwards company_id to getRoles', async () => {
    await controller.getRoles(mockUser);
    expect(mockService.getRoles).toHaveBeenCalledWith(mockCompanyId);
  });
});
