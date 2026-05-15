import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyResponseDto } from './dto/company-response.dto';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
  }): Promise<{ data: CompanyResponseDto[]; total: number }> {
    const { page = 1, limit = 20 } = query;
    const [companies, total] = await this.companyRepo.findAndCount({
      where: {},
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    return { data: companies.map(this.toResponse), total };
  }

  async findOne(id: string): Promise<CompanyResponseDto> {
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

  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyResponseDto> {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
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

  private toResponse(c: Company): CompanyResponseDto {
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
