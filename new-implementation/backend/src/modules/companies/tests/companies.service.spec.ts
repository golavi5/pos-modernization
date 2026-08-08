import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CompaniesService } from '../companies.service';
import { Company } from '../entities/company.entity';
import { User } from '../../auth/entities/user.entity';
import { Role } from '../../auth/entities/role.entity';

function actor(companyId: string, roleNames: string[]): User {
  const user = new User();
  user.company_id = companyId;
  user.roles = roleNames.map((name) => ({ name }) as Role);
  return user;
}

describe('CompaniesService', () => {
  let service: CompaniesService;
  let repo: Repository<Company>;

  const superadmin = actor('company-uuid', ['superadmin']);
  const tenantAdmin = actor('company-uuid', ['admin']);

  const mockCompany: Company = {
    id: 'company-uuid',
    name: 'Acme Corp',
    address: '123 Main St',
    phone: '555-1234',
    email: 'info@acme.com',
    tax_id: 'NIT-123',
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    orders: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getRepositoryToken(Company),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    repo = module.get<Repository<Company>>(getRepositoryToken(Company));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated companies', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[mockCompany], 1]);

      const result = await service.findAll({ page: 1, limit: 10 }, superadmin);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a company by id', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockCompany);

      const result = await service.findOne('company-uuid', superadmin);

      expect(result.id).toBe('company-uuid');
      expect(result.name).toBe('Acme Corp');
    });

    it('should throw NotFoundException when company not found', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('non-existent', superadmin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a company', async () => {
      const dto = { name: 'New Corp', email: 'new@corp.com' };
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      jest.spyOn(repo, 'create').mockReturnValue({ ...mockCompany, ...dto });
      jest.spyOn(repo, 'save').mockResolvedValue({ ...mockCompany, ...dto });

      const result = await service.create(dto);

      expect(result.name).toBe('New Corp');
    });

    it('should throw ConflictException when name already exists', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockCompany);

      await expect(service.create({ name: 'Acme Corp' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the company', async () => {
      const updated = { ...mockCompany, name: 'Updated Corp' };
      jest
        .spyOn(repo, 'findOne')
        .mockResolvedValueOnce(mockCompany) // fetch by id
        .mockResolvedValueOnce(null);       // conflict check — name not taken
      jest.spyOn(repo, 'save').mockResolvedValue(updated);

      const result = await service.update('company-uuid', { name: 'Updated Corp' }, superadmin);

      expect(result.name).toBe('Updated Corp');
    });

    it('should throw NotFoundException when company does not exist', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'X' }, superadmin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should deactivate the company', async () => {
      const deactivated = { ...mockCompany, is_active: false };
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockCompany);
      jest.spyOn(repo, 'save').mockResolvedValue(deactivated);

      const result = await service.remove('company-uuid');

      expect(result.message).toBe('Company deactivated successfully');
    });

    it('should throw NotFoundException when company does not exist', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /**
   * `GET /companies`, `GET /companies/:id` and `PATCH /companies/:id` are
   * `@Roles('admin','superadmin')`, so a tenant admin reaches them literally —
   * the ADMIN superuser bypass is not what lets them in and tightening the
   * decorator would lock admins out of their own company. Tenant isolation is
   * therefore enforced in the service, against the actor. See SPEC-CUT-001 S-07.
   */
  describe('tenant scoping', () => {
    const otherCompany = 'company-other';

    it('constrains the list query to the tenant admin own company', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[mockCompany], 1]);

      await service.findAll({ page: 1, limit: 10 }, tenantAdmin);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'company-uuid' } }),
      );
    });

    it('lets a superadmin list every company', async () => {
      jest.spyOn(repo, 'findAndCount').mockResolvedValue([[mockCompany], 1]);

      await service.findAll({ page: 1, limit: 10 }, superadmin);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('refuses to list rather than fall back to an unscoped query when the actor has no company', async () => {
      const findAndCount = jest
        .spyOn(repo, 'findAndCount')
        .mockResolvedValue([[mockCompany], 1]);

      await expect(
        service.findAll({ page: 1, limit: 10 }, actor(undefined as any, ['admin'])),
      ).rejects.toThrow(ForbiddenException);
      expect(findAndCount).not.toHaveBeenCalled();
    });

    it('hides another tenant company from a tenant admin on read', async () => {
      const findOne = jest.spyOn(repo, 'findOne').mockResolvedValue(mockCompany);

      await expect(service.findOne(otherCompany, tenantAdmin)).rejects.toThrow(
        NotFoundException,
      );
      expect(findOne).not.toHaveBeenCalled();
    });

    it('lets a superadmin read another tenant company', async () => {
      jest
        .spyOn(repo, 'findOne')
        .mockResolvedValue({ ...mockCompany, id: otherCompany });

      const result = await service.findOne(otherCompany, superadmin);

      expect(result.id).toBe(otherCompany);
    });

    it('blocks a tenant admin from updating another tenant company', async () => {
      const findOne = jest.spyOn(repo, 'findOne').mockResolvedValue(mockCompany);
      const save = jest.spyOn(repo, 'save');

      await expect(
        service.update(otherCompany, { name: 'Hijacked' }, tenantAdmin),
      ).rejects.toThrow(NotFoundException);
      expect(findOne).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('still lets a tenant admin update their own company', async () => {
      jest
        .spyOn(repo, 'findOne')
        .mockResolvedValueOnce(mockCompany)
        .mockResolvedValueOnce(null);
      jest
        .spyOn(repo, 'save')
        .mockResolvedValue({ ...mockCompany, name: 'Acme Renamed' });

      const result = await service.update(
        'company-uuid',
        { name: 'Acme Renamed' },
        tenantAdmin,
      );

      expect(result.name).toBe('Acme Renamed');
    });
  });
});
