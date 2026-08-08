import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { User } from '../auth/entities/user.entity';
import { ELEVATED_ROLES } from '../auth/constants/elevated-roles';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
    },
    actor: User,
  ): Promise<{ data: CompanyResponseDto[]; total: number }> {
    const { page = 1, limit = 20 } = query;
    const [companies, total] = await this.companyRepo.findAndCount({
      where: this.tenantScope(actor),
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    return { data: companies.map(this.toResponse), total };
  }

  async findOne(id: string, actor: User): Promise<CompanyResponseDto> {
    this.assertMayAccess(id, actor);
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return this.toResponse(company);
  }

  async create(dto: CreateCompanyDto): Promise<CompanyResponseDto> {
    const existing = await this.companyRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Company name "${dto.name}" already exists`);
    }
    const company = this.companyRepo.create({ ...dto, is_active: dto.is_active ?? true });
    const saved = await this.companyRepo.save(company);
    this.logger.log(`Created company ${saved.id}: ${saved.name}`);
    return this.toResponse(saved);
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
    actor: User,
  ): Promise<CompanyResponseDto> {
    this.assertMayAccess(id, actor);
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException(`Company ${id} not found`);

    if (dto.name && dto.name !== company.name) {
      const conflict = await this.companyRepo.findOne({ where: { name: dto.name } });
      if (conflict) {
        throw new ConflictException(`Company name "${dto.name}" already exists`);
      }
    }

    Object.assign(company, dto);
    const saved = await this.companyRepo.save(company);
    return this.toResponse(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    company.is_active = false;
    await this.companyRepo.save(company);
    this.logger.log(`Deactivated company ${id}`);
    return { message: 'Company deactivated successfully' };
  }

  /**
   * Tenant isolation for the routes a tenant admin can reach (`GET /companies`,
   * `GET /companies/:id`, `PATCH /companies/:id`). Only an elevated
   * (platform-level) actor sees across tenants — see ELEVATED_ROLES.
   */
  private tenantScope(actor: User): FindOptionsWhere<Company> {
    if (actor.hasAnyRole(ELEVATED_ROLES)) return {};
    // TypeORM drops an `undefined` predicate, which would silently widen this
    // back to every company — refuse instead of querying unscoped.
    if (!actor.company_id) {
      throw new ForbiddenException('Actor has no company context');
    }
    return { id: actor.company_id };
  }

  /**
   * Out-of-tenant ids are reported as NotFound, not Forbidden, so the response
   * does not confirm that another company exists.
   */
  private assertMayAccess(id: string, actor: User): void {
    if (!actor.hasAnyRole(ELEVATED_ROLES) && id !== actor.company_id) {
      throw new NotFoundException(`Company ${id} not found`);
    }
  }

  private toResponse = (c: Company): CompanyResponseDto => {
    return {
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      email: c.email,
      tax_id: c.tax_id,
      is_active: c.is_active,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  }
}
