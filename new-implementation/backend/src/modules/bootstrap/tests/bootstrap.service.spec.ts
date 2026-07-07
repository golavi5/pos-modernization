import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BootstrapService } from '../bootstrap.service';
import { SystemRolesService } from '../system-roles.service';
import { User } from '../../auth/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

describe('BootstrapService', () => {
  let service: BootstrapService;
  let userRepo: any;
  let companyRepo: any;
  let ensureSystemRoles: jest.Mock;
  const ORIGINAL_ENV = process.env;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    userRepo = {
      count: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'u1', ...x })),
    };
    companyRepo = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'c1', ...x })),
    };
    ensureSystemRoles = jest.fn().mockResolvedValue(
      new Map([
        ['admin', { id: 'role-admin', name: 'admin' }],
        ['superadmin', { id: 'role-superadmin', name: 'superadmin' }],
      ]),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BootstrapService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: SystemRolesService, useValue: { ensureSystemRoles } },
      ],
    }).compile();

    service = module.get<BootstrapService>(BootstrapService);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('no-ops when users already exist (idempotent)', async () => {
    userRepo.count.mockResolvedValue(3);
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@x.com';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'a-strong-password';

    await service.onApplicationBootstrap();

    expect(companyRepo.save).not.toHaveBeenCalled();
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('no-ops when bootstrap env vars are missing', async () => {
    userRepo.count.mockResolvedValue(0);
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;

    await service.onApplicationBootstrap();

    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('no-ops when the password is too weak', async () => {
    userRepo.count.mockResolvedValue(0);
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@x.com';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'short';

    await service.onApplicationBootstrap();

    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('creates company + admin user with roles from SystemRolesService on an empty DB', async () => {
    userRepo.count.mockResolvedValue(0);
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@x.com';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'a-strong-password';

    await service.onApplicationBootstrap();

    expect(companyRepo.save).toHaveBeenCalledTimes(1);
    const savedUser = userRepo.save.mock.calls[0][0];
    expect(savedUser.email).toBe('admin@x.com');
    expect(savedUser.company_id).toBe('c1');
    expect(savedUser.roles).toHaveLength(2);
    expect(savedUser.password_hash).not.toBe('a-strong-password'); // hashed
  });

  it('reconciles system roles on every boot, even when users already exist', async () => {
    userRepo.count.mockResolvedValue(5); // already bootstrapped

    await service.onApplicationBootstrap();

    expect(ensureSystemRoles).toHaveBeenCalledTimes(1);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('grants the bootstrap admin both admin and superadmin on an empty DB', async () => {
    userRepo.count.mockResolvedValue(0);
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@x.io';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'ExactlyTwelve1!';

    await service.onApplicationBootstrap();

    const savedUser = userRepo.save.mock.calls.at(-1)[0];
    const roleNames = savedUser.roles.map((r: any) => r.name).sort();
    expect(roleNames).toEqual(['admin', 'superadmin']);
  });
});
