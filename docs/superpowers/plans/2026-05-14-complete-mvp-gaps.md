# Complete MVP Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four remaining gaps that block MVP completeness: Swagger docs, Companies CRUD module, report PDF/Excel exports, and unit tests for Users/Settings/Notifications services.

**Architecture:** Each task is isolated — Swagger is a one-file change to `main.ts`; the Companies module follows the exact pattern used by Products (DTOs → Service → Controller → Module → app.module.ts wire-up); Export service gets `pdfkit` + `exceljs` installed then implemented; test files are added alongside existing module structure.

**Tech Stack:** NestJS 10, TypeORM, MySQL, `@nestjs/swagger ^7`, `pdfkit`, `@types/pdfkit`, `exceljs`, Jest 29, `@nestjs/testing`

---

## File Map

### Created
- `new-implementation/backend/src/modules/companies/dto/create-company.dto.ts`
- `new-implementation/backend/src/modules/companies/dto/update-company.dto.ts`
- `new-implementation/backend/src/modules/companies/dto/company-response.dto.ts`
- `new-implementation/backend/src/modules/companies/companies.service.ts`
- `new-implementation/backend/src/modules/companies/tests/companies.service.spec.ts`
- `new-implementation/backend/src/modules/companies/companies.controller.ts`
- `new-implementation/backend/src/modules/companies/companies.module.ts`
- `new-implementation/backend/src/modules/users/tests/users.service.spec.ts`
- `new-implementation/backend/src/modules/settings/tests/settings.service.spec.ts`
- `new-implementation/backend/src/modules/notifications/tests/notifications.service.spec.ts`

### Modified
- `new-implementation/backend/src/main.ts`
- `new-implementation/backend/src/app.module.ts`
- `new-implementation/backend/src/modules/reports/services/export.service.ts`

---

## Task 1: Swagger/OpenAPI Setup

**Files:**
- Modify: `new-implementation/backend/src/main.ts`

- [ ] **Step 1: Update main.ts with SwaggerModule**

Replace the entire file with:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('POS API')
    .setDescription('Point of Sale REST API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  });
}
bootstrap();
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd new-implementation/backend && npm run build
```

Expected: exits 0, `dist/` folder updated

- [ ] **Step 3: Commit**

```bash
git add new-implementation/backend/src/main.ts
git commit -m "feat: add Swagger/OpenAPI documentation at /api/docs"
```

---

## Task 2: Companies Module — DTOs

**Files:**
- Create: `new-implementation/backend/src/modules/companies/dto/create-company.dto.ts`
- Create: `new-implementation/backend/src/modules/companies/dto/update-company.dto.ts`
- Create: `new-implementation/backend/src/modules/companies/dto/company-response.dto.ts`

- [ ] **Step 1: Create `create-company.dto.ts`**

```typescript
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tax_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
```

- [ ] **Step 2: Create `update-company.dto.ts`**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
```

- [ ] **Step 3: Create `company-response.dto.ts`**

```typescript
export class CompanyResponseDto {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

- [ ] **Step 4: Commit**

```bash
git add new-implementation/backend/src/modules/companies/dto/
git commit -m "feat(companies): add DTOs for companies module"
```

---

## Task 3: Companies Module — Service (TDD)

**Files:**
- Create (test first): `new-implementation/backend/src/modules/companies/tests/companies.service.spec.ts`
- Create (implementation): `new-implementation/backend/src/modules/companies/companies.service.ts`

- [ ] **Step 1: Create the failing test file**

Create `new-implementation/backend/src/modules/companies/tests/companies.service.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
cd new-implementation/backend && npx jest --testPathPattern=companies.service.spec --no-coverage 2>&1 | tail -20
```

Expected: `Cannot find module '../companies.service'` or similar failure

- [ ] **Step 3: Create `companies.service.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd new-implementation/backend && npx jest --testPathPattern=companies.service.spec --no-coverage
```

Expected: `Tests: 8 passed, 8 total`

- [ ] **Step 5: Commit**

```bash
git add new-implementation/backend/src/modules/companies/
git commit -m "feat(companies): add CompaniesService with full CRUD and tests"
```

---

## Task 4: Companies Module — Controller, Module, Wire-up

**Files:**
- Create: `new-implementation/backend/src/modules/companies/companies.controller.ts`
- Create: `new-implementation/backend/src/modules/companies/companies.module.ts`
- Modify: `new-implementation/backend/src/app.module.ts`

- [ ] **Step 1: Create `companies.controller.ts`**

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @Roles('admin', 'superadmin')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.companiesService.findAll({ page, limit });
  }

  @Get(':id')
  @Roles('admin', 'superadmin')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  @Roles('superadmin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'superadmin')
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('superadmin')
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
```

- [ ] **Step 2: Create `companies.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
```

- [ ] **Step 3: Wire CompaniesModule into `app.module.ts`**

Add the import and module registration. Open `new-implementation/backend/src/app.module.ts` and:

1. Add this import line after the last existing import:
```typescript
import { CompaniesModule } from './modules/companies/companies.module';
```

2. Add `CompaniesModule` to the `imports` array after `SettingsModule`:
```typescript
    SettingsModule,
    CompaniesModule,
```

- [ ] **Step 4: Build to verify**

```bash
cd new-implementation/backend && npm run build
```

Expected: exits 0

- [ ] **Step 5: Commit**

```bash
git add new-implementation/backend/src/modules/companies/companies.controller.ts \
        new-implementation/backend/src/modules/companies/companies.module.ts \
        new-implementation/backend/src/app.module.ts
git commit -m "feat(companies): wire up controller, module, and register in AppModule"
```

---

## Task 5: Report Exports — Install Libraries + Implement PDF and Excel

**Files:**
- Modify: `new-implementation/backend/src/modules/reports/services/export.service.ts`

- [ ] **Step 1: Install pdfkit and exceljs**

```bash
cd new-implementation/backend && npm install pdfkit exceljs && npm install --save-dev @types/pdfkit
```

Expected: `added N packages`

- [ ] **Step 2: Replace `export.service.ts` with working implementation**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import { ExportFormat } from '../dto/report-query.dto';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  async exportToPDF(
    data: any,
    filename: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () =>
        resolve({ buffer: Buffer.concat(chunks), filename: `${filename}.pdf` }),
      );
      doc.on('error', reject);

      doc.fontSize(18).text(filename, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);

      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        data.forEach((row, i) => {
          if (i > 0) doc.moveDown(0.3);
          const line = headers.map((h) => `${h}: ${row[h] ?? ''}`).join(' | ');
          doc.text(line);
        });
      } else {
        doc.text(JSON.stringify(data, null, 2));
      }

      doc.end();
    });
  }

  async exportToExcel(
    data: any,
    filename: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.columns = headers.map((h) => ({
        header: h,
        key: h,
        width: 20,
      }));
      data.forEach((row) => worksheet.addRow(row));
    } else {
      worksheet.addRow(['Data']);
      worksheet.addRow([JSON.stringify(data)]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Excel export generated: ${filename}.xlsx`);
    return { buffer: Buffer.from(buffer), filename: `${filename}.xlsx` };
  }

  async exportToCSV(
    data: any[],
    filename: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array for CSV export');
    }

    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';

    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        if (
          typeof value === 'string' &&
          (value.includes(',') || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      });
      csv += values.join(',') + '\n';
    });

    return { buffer: Buffer.from(csv, 'utf-8'), filename: `${filename}.csv` };
  }

  async export(
    data: any,
    format: ExportFormat,
    filename = 'report',
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    let result: { buffer: Buffer; filename: string };
    let mimeType: string;

    switch (format) {
      case ExportFormat.PDF:
        result = await this.exportToPDF(data, filename);
        mimeType = 'application/pdf';
        break;
      case ExportFormat.EXCEL:
        result = await this.exportToExcel(data, filename);
        mimeType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case ExportFormat.CSV:
        result = await this.exportToCSV(data, filename);
        mimeType = 'text/csv';
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    return { ...result, mimeType };
  }
}
```

- [ ] **Step 3: Build to verify**

```bash
cd new-implementation/backend && npm run build
```

Expected: exits 0 with no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add new-implementation/backend/src/modules/reports/services/export.service.ts \
        new-implementation/backend/package.json \
        new-implementation/backend/package-lock.json
git commit -m "feat(reports): implement PDF and Excel export using pdfkit and exceljs"
```

---

## Task 6: UsersService Tests

**Files:**
- Create: `new-implementation/backend/src/modules/users/tests/users.service.spec.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { User } from '../../auth/entities/user.entity';
import { Role } from '../../auth/entities/role.entity';

const mockQb = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getCount: jest.fn().mockResolvedValue(0),
  getRawMany: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 0 }),
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

  const mockRole: Partial<Role> = {
    id: 'role-uuid',
    name: 'cashier',
    description: 'Cashier role',
    is_system_role: false,
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
  });

  describe('create', () => {
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

      const result = await service.create(companyId, dto);

      expect(result.name).toBe('Bob');
    });

    it('should throw ConflictException when email is already in use', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as User);

      await expect(
        service.create(companyId, {
          email: 'alice@example.com',
          password: 'x',
        } as any),
      ).rejects.toThrow(ConflictException);
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
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
cd new-implementation/backend && npx jest --testPathPattern=users/tests/users.service.spec --no-coverage
```

Expected: `Tests: 8 passed, 8 total`

- [ ] **Step 3: Commit**

```bash
git add new-implementation/backend/src/modules/users/tests/
git commit -m "test(users): add unit tests for UsersService"
```

---

## Task 7: SettingsService Tests

**Files:**
- Create: `new-implementation/backend/src/modules/settings/tests/settings.service.spec.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsService } from '../services/settings.service';
import { Settings } from '../entities/settings.entity';

describe('SettingsService', () => {
  let service: SettingsService;
  let repo: Repository<Settings>;

  const companyId = 'company-uuid';

  const mockSettings: Partial<Settings> = {
    id: 1,
    companyId,
    companyName: 'Mi Empresa',
    currency: 'COP',
    locale: 'es-CO',
    taxRate: 19,
    taxIncludedInPrice: true,
    paymentCash: true,
    paymentCard: true,
    paymentTransfer: true,
    paymentCredit: false,
    trackInventory: true,
    allowNegativeStock: false,
    defaultReorderPoint: 5,
    requireCustomer: false,
    printReceiptAutomatically: false,
    largeSaleThreshold: 500000,
    loyaltyEnabled: true,
    loyaltyPointsPerCurrency: 1,
    loyaltyPointValue: 0.01,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(Settings), useClass: Repository },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    repo = module.get<Repository<Settings>>(getRepositoryToken(Settings));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return existing settings', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockSettings as Settings);

      const result = await service.getSettings(companyId);

      expect(result.companyId).toBe(companyId);
      expect(result.currency).toBe('COP');
    });

    it('should create default settings when none exist', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      jest.spyOn(repo, 'create').mockReturnValue(mockSettings as Settings);
      jest.spyOn(repo, 'save').mockResolvedValue(mockSettings as Settings);

      const result = await service.getSettings(companyId);

      expect(result.currency).toBe('COP');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId, currency: 'COP' }),
      );
    });
  });

  describe('updateCompany', () => {
    it('should update company info and return updated settings', async () => {
      const updated = { ...mockSettings, companyName: 'Nueva Empresa' } as Settings;
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockSettings as Settings);
      jest.spyOn(repo, 'save').mockResolvedValue(updated);

      const result = await service.updateCompany(companyId, {
        companyName: 'Nueva Empresa',
      } as any);

      expect(result.companyName).toBe('Nueva Empresa');
    });
  });

  describe('updateTax', () => {
    it('should update tax settings', async () => {
      const updated = { ...mockSettings, taxRate: 0 } as Settings;
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockSettings as Settings);
      jest.spyOn(repo, 'save').mockResolvedValue(updated);

      const result = await service.updateTax(companyId, { taxRate: 0 } as any);

      expect(result.taxRate).toBe(0);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset settings to defaults and save', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockSettings as Settings);
      jest.spyOn(repo, 'save').mockResolvedValue(mockSettings as Settings);

      const result = await service.resetToDefaults(companyId);

      expect(result.currency).toBe('COP');
      expect(repo.save).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
cd new-implementation/backend && npx jest --testPathPattern=settings/tests/settings.service.spec --no-coverage
```

Expected: `Tests: 6 passed, 6 total`

- [ ] **Step 3: Commit**

```bash
git add new-implementation/backend/src/modules/settings/tests/
git commit -m "test(settings): add unit tests for SettingsService"
```

---

## Task 8: NotificationsService Tests

**Files:**
- Create: `new-implementation/backend/src/modules/notifications/tests/notifications.service.spec.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../entities/notification.entity';

const mockQb = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getCount: jest.fn().mockResolvedValue(0),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 0 }),
  delete: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: Repository<Notification>;

  const companyId = 'company-uuid';
  const userId = 'user-uuid';

  const mockNotification: Partial<Notification> = {
    id: 1,
    companyId,
    userId,
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.LOW,
    title: 'Test notification',
    message: 'Hello world',
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useClass: Repository },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repo = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated notifications with unread count', async () => {
      const qb = mockQb();
      qb.getManyAndCount.mockResolvedValue([[mockNotification as Notification], 1]);
      jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(qb as any);
      jest.spyOn(repo, 'count').mockResolvedValue(3);

      const result = await service.findAll(companyId, userId, {
        page: 1,
        pageSize: 20,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(3);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const qb = mockQb();
      qb.getCount.mockResolvedValue(5);
      jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.getUnreadCount(companyId, userId);

      expect(result.count).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const updated = { ...mockNotification, isRead: true, readAt: new Date() } as Notification;
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockNotification as Notification);
      jest.spyOn(repo, 'save').mockResolvedValue(updated);

      const result = await service.markAsRead(1, companyId);

      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException when notification not found', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);

      await expect(service.markAsRead(999, companyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should return count of updated notifications', async () => {
      const qb = mockQb();
      qb.execute.mockResolvedValue({ affected: 4 });
      jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.markAllAsRead(companyId, userId);

      expect(result.updated).toBe(4);
    });
  });

  describe('remove', () => {
    it('should delete the notification', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockNotification as Notification);
      jest.spyOn(repo, 'remove').mockResolvedValue(mockNotification as Notification);

      const result = await service.remove(1, companyId);

      expect(result.message).toBe('Notification deleted');
    });

    it('should throw NotFoundException when not found', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, companyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('notifyLowStock', () => {
    it('should create a low-stock notification', async () => {
      jest.spyOn(repo, 'create').mockReturnValue(mockNotification as Notification);
      jest.spyOn(repo, 'save').mockResolvedValue(mockNotification as Notification);

      await service.notifyLowStock({
        companyId,
        productId: 42,
        productName: 'Widget',
        sku: 'SKU-001',
        currentStock: 2,
        reorderPoint: 5,
      });

      expect(repo.save).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
cd new-implementation/backend && npx jest --testPathPattern=notifications/tests/notifications.service.spec --no-coverage
```

Expected: `Tests: 8 passed, 8 total`

- [ ] **Step 3: Run the full test suite to make sure nothing is broken**

```bash
cd new-implementation/backend && npm run test -- --no-coverage 2>&1 | tail -20
```

Expected: all existing tests continue to pass; no regressions

- [ ] **Step 4: Commit**

```bash
git add new-implementation/backend/src/modules/notifications/tests/
git commit -m "test(notifications): add unit tests for NotificationsService"
```

---

## Self-Review

**Spec coverage:**
- ✅ Swagger setup (Task 1)
- ✅ Companies DTOs (Task 2)
- ✅ Companies Service with TDD (Task 3)
- ✅ Companies Controller + Module + wire-up (Task 4)
- ✅ Report export pdfkit + exceljs (Task 5)
- ✅ UsersService tests (Task 6)
- ✅ SettingsService tests (Task 7)
- ✅ NotificationsService tests (Task 8)

**Type consistency:**
- `CompanyResponseDto` shape is consistent between `companies.service.ts` (which maps to it) and the spec in `companies.service.spec.ts` (which checks `result.id`, `result.name`)
- `mockQb()` helper used identically in UsersService and NotificationsService specs
- `UsersService.toggleStatus` — test expects `result.isActive` (camelCase) matching `mapToResponse` output field name `isActive` ✅
- Settings entity uses `companyId` (camelCase) consistent with `SettingsService` and test mock ✅

**Placeholder scan:** No TBD/TODO/placeholder language found. Every step has complete code or an exact command.
