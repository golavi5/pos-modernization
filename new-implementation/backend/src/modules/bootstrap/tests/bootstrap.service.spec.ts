import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BootstrapService } from '../bootstrap.service';
import { User } from '../../auth/entities/user.entity';
import { Role } from '../../auth/entities/role.entity';
import { Company } from '../../companies/entities/company.entity';

describe('BootstrapService', () => {
  let service: BootstrapService;
  let userRepo: any;
  let roleRepo: any;
  let companyRepo: any;
  const ORIGINAL_ENV = process.env;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    userRepo = {
      count: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'u1', ...x })),
    };
    roleRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'r1', ...x })),
    };
    companyRepo = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'c1', ...x })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BootstrapService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
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

  it('creates company + admin role + admin user on an empty DB', async () => {
    userRepo.count.mockResolvedValue(0);
    roleRepo.findOne.mockResolvedValue(null);
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@x.com';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'a-strong-password';

    await service.onApplicationBootstrap();

    expect(companyRepo.save).toHaveBeenCalledTimes(1);
    expect(roleRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'admin', is_system_role: true }),
    );
    const savedUser = userRepo.save.mock.calls[0][0];
    expect(savedUser.email).toBe('admin@x.com');
    expect(savedUser.company_id).toBe('c1');
    expect(savedUser.roles).toHaveLength(1);
    expect(savedUser.password_hash).not.toBe('a-strong-password'); // hashed
  });

  it('reuses an existing admin role instead of creating a new one', async () => {
    userRepo.count.mockResolvedValue(0);
    roleRepo.findOne.mockResolvedValue({ id: 'existing', name: 'admin' });
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@x.com';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'a-strong-password';

    await service.onApplicationBootstrap();

    expect(roleRepo.save).not.toHaveBeenCalled();
    expect(userRepo.save.mock.calls[0][0].roles[0].id).toBe('existing');
  });
});
