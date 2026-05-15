import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CompaniesService } from '../companies.service';
import { Company } from '../entities/company.entity';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let repo: Repository<Company>;

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

      const result = await service.findAll({ page: 1, limit: 10 });

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

      const result = await service.findOne('company-uuid');

      expect(result.id).toBe('company-uuid');
      expect(result.name).toBe('Acme Corp');
    });

    it('should throw NotFoundException when company not found', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
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
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockCompany);
      jest.spyOn(repo, 'save').mockResolvedValue(updated);

      const result = await service.update('company-uuid', { name: 'Updated Corp' });

      expect(result.name).toBe('Updated Corp');
    });

    it('should throw NotFoundException when company does not exist', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'X' }),
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
});
