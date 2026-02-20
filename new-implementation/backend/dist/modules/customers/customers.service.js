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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("./customer.entity");
let CustomersService = class CustomersService {
    constructor(customerRepository) {
        this.customerRepository = customerRepository;
    }
    async create(createCustomerDto, companyId) {
        if (createCustomerDto.email) {
            const existingByEmail = await this.customerRepository.findOne({
                where: { company_id: companyId, email: createCustomerDto.email },
            });
            if (existingByEmail) {
                throw new common_1.BadRequestException('Customer with this email already exists');
            }
        }
        if (createCustomerDto.phone) {
            const existingByPhone = await this.customerRepository.findOne({
                where: { company_id: companyId, phone: createCustomerDto.phone },
            });
            if (existingByPhone) {
                throw new common_1.BadRequestException('Customer with this phone already exists');
            }
        }
        const customer = this.customerRepository.create({
            ...createCustomerDto,
            company_id: companyId,
            loyalty_points: 0,
            total_purchases: 0,
            is_active: true,
        });
        const saved = await this.customerRepository.save(customer);
        return this.toResponseDto(saved);
    }
    async findAll(query, companyId) {
        const { page = 1, limit: pageSize = 20, search, isActive, minLoyaltyPoints, sort_by: sortBy = 'created_at', order: sortOrder = 'DESC', } = query;
        const qb = this.customerRepository.createQueryBuilder('customer');
        qb.where('customer.company_id = :companyId', { companyId });
        if (search) {
            qb.andWhere('(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)', { search: `%${search}%` });
        }
        if (isActive !== undefined) {
            qb.andWhere('customer.is_active = :isActive', { isActive });
        }
        if (minLoyaltyPoints !== undefined) {
            qb.andWhere('customer.loyalty_points >= :minLoyaltyPoints', { minLoyaltyPoints });
        }
        const orderColumn = sortBy === 'name' ? 'customer.name' :
            sortBy === 'total_purchases' ? 'customer.total_purchases' :
                sortBy === 'loyalty_points' ? 'customer.loyalty_points' :
                    'customer.created_at';
        qb.orderBy(orderColumn, sortOrder);
        const skip = (page - 1) * pageSize;
        qb.skip(skip).take(pageSize);
        const [customers, total] = await qb.getManyAndCount();
        return {
            data: customers.map((c) => this.toResponseDto(c)),
            total,
            page,
            pageSize,
        };
    }
    async findOne(id, companyId) {
        const customer = await this.customerRepository.findOne({
            where: { id, company_id: companyId },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        return this.toResponseDto(customer);
    }
    async update(id, updateCustomerDto, companyId) {
        const customer = await this.customerRepository.findOne({
            where: { id, company_id: companyId },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
            const existingByEmail = await this.customerRepository.findOne({
                where: { company_id: companyId, email: updateCustomerDto.email },
            });
            if (existingByEmail && existingByEmail.id !== id) {
                throw new common_1.BadRequestException('Customer with this email already exists');
            }
        }
        if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
            const existingByPhone = await this.customerRepository.findOne({
                where: { company_id: companyId, phone: updateCustomerDto.phone },
            });
            if (existingByPhone && existingByPhone.id !== id) {
                throw new common_1.BadRequestException('Customer with this phone already exists');
            }
        }
        Object.assign(customer, updateCustomerDto);
        const updated = await this.customerRepository.save(customer);
        return this.toResponseDto(updated);
    }
    async remove(id, companyId) {
        const customer = await this.customerRepository.findOne({
            where: { id, company_id: companyId },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        customer.is_active = false;
        await this.customerRepository.save(customer);
    }
    async getPurchaseHistory(id, companyId, limit = 10) {
        const customer = await this.customerRepository.findOne({
            where: { id, company_id: companyId },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        return [];
    }
    async updateLoyaltyPoints(id, updateLoyaltyDto, companyId) {
        const customer = await this.customerRepository.findOne({
            where: { id, company_id: companyId },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        const { points, operation } = updateLoyaltyDto;
        if (operation === 'add') {
            customer.loyalty_points += points;
        }
        else if (operation === 'subtract') {
            if (customer.loyalty_points < points) {
                throw new common_1.BadRequestException('Insufficient loyalty points');
            }
            customer.loyalty_points -= points;
        }
        else if (operation === 'set') {
            customer.loyalty_points = points;
        }
        const updated = await this.customerRepository.save(customer);
        return this.toResponseDto(updated);
    }
    async getTopCustomers(companyId, limit = 10) {
        const customers = await this.customerRepository.find({
            where: { company_id: companyId, is_active: true },
            order: { total_purchases: 'DESC' },
            take: limit,
        });
        return customers.map((c) => this.toResponseDto(c));
    }
    async getStats(companyId) {
        const qb = this.customerRepository.createQueryBuilder('customer');
        qb.where('customer.company_id = :companyId', { companyId });
        const [allCustomers, totalCustomers] = await qb.getManyAndCount();
        const activeCustomers = allCustomers.filter((c) => c.is_active).length;
        const inactiveCustomers = totalCustomers - activeCustomers;
        const totalLoyaltyPoints = allCustomers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
        const totalRevenue = allCustomers.reduce((sum, c) => sum + (c.total_purchases || 0), 0);
        const avgPurchaseValue = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentCustomers = allCustomers.filter((c) => c.last_purchase_date && c.last_purchase_date >= thirtyDaysAgo).length;
        return {
            totalCustomers,
            activeCustomers,
            inactiveCustomers,
            totalLoyaltyPoints,
            avgPurchaseValue,
            recentCustomers,
        };
    }
    async advancedSearch(query, companyId) {
        const qb = this.customerRepository.createQueryBuilder('customer');
        qb.where('customer.company_id = :companyId', { companyId });
        if (query.search) {
            qb.andWhere('(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)', { search: `%${query.search}%` });
        }
        if (query.isActive !== undefined) {
            qb.andWhere('customer.is_active = :isActive', { isActive: query.isActive });
        }
        if (query.minLoyaltyPoints !== undefined) {
            qb.andWhere('customer.loyalty_points >= :minLoyaltyPoints', {
                minLoyaltyPoints: query.minLoyaltyPoints,
            });
        }
        const sortBy = query.sort_by || 'created_at';
        const sortOrder = query.order || 'DESC';
        const orderColumn = sortBy === 'name'
            ? 'customer.name'
            : sortBy === 'total_purchases'
                ? 'customer.total_purchases'
                : sortBy === 'loyalty_points'
                    ? 'customer.loyalty_points'
                    : 'customer.created_at';
        qb.orderBy(orderColumn, sortOrder);
        qb.limit(100);
        const customers = await qb.getMany();
        return customers.map((c) => this.toResponseDto(c));
    }
    async updatePurchaseStats(customerId, companyId, purchaseAmount) {
        const customer = await this.customerRepository.findOne({
            where: { id: customerId, company_id: companyId },
        });
        if (!customer) {
            return;
        }
        customer.total_purchases += purchaseAmount;
        customer.last_purchase_date = new Date();
        await this.customerRepository.save(customer);
    }
    toResponseDto(customer) {
        return {
            id: customer.id,
            company_id: customer.company_id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            loyalty_points: customer.loyalty_points,
            total_purchases: customer.total_purchases,
            last_purchase_date: customer.last_purchase_date,
            is_active: customer.is_active,
            created_at: customer.created_at,
            updated_at: customer.updated_at,
        };
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CustomersService);
//# sourceMappingURL=customers.service.js.map