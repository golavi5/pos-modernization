import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, Like, ILike } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { CustomerStatsDto } from './dto/customer-stats.dto';
import { UpdateLoyaltyPointsDto } from './dto/loyalty.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  /**
   * Create a new customer
   */
  async create(
    createCustomerDto: CreateCustomerDto,
    companyId: string,
  ): Promise<CustomerResponseDto> {
    // Check if customer with same email or phone already exists
    if (createCustomerDto.email) {
      const existingByEmail = await this.customerRepository.findOne({
        where: { company_id: companyId, email: createCustomerDto.email },
      });
      if (existingByEmail) {
        throw new BadRequestException('Customer with this email already exists');
      }
    }

    if (createCustomerDto.phone) {
      const existingByPhone = await this.customerRepository.findOne({
        where: { company_id: companyId, phone: createCustomerDto.phone },
      });
      if (existingByPhone) {
        throw new BadRequestException('Customer with this phone already exists');
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

  /**
   * Find all customers with pagination and filters
   */
  async findAll(
    query: CustomerQueryDto,
    companyId: string,
  ): Promise<{ data: CustomerResponseDto[]; total: number; page: number; pageSize: number }> {
    const {
      page = 1,
      pageSize = 20,
      search,
      isActive,
      minLoyaltyPoints,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = query;

    const qb = this.customerRepository.createQueryBuilder('customer');
    qb.where('customer.company_id = :companyId', { companyId });

    // Search filter
    if (search) {
      qb.andWhere(
        '(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Active filter
    if (isActive !== undefined) {
      qb.andWhere('customer.is_active = :isActive', { isActive });
    }

    // Loyalty points filter
    if (minLoyaltyPoints !== undefined) {
      qb.andWhere('customer.loyalty_points >= :minLoyaltyPoints', { minLoyaltyPoints });
    }

    // Sorting
    const orderColumn = sortBy === 'name' ? 'customer.name' :
                        sortBy === 'total_purchases' ? 'customer.total_purchases' :
                        sortBy === 'loyalty_points' ? 'customer.loyalty_points' :
                        'customer.created_at';
    qb.orderBy(orderColumn, sortOrder);

    // Pagination
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

  /**
   * Find one customer by ID
   */
  async findOne(id: string, companyId: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.toResponseDto(customer);
  }

  /**
   * Update a customer
   */
  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    companyId: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Check email uniqueness if changing
    if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
      const existingByEmail = await this.customerRepository.findOne({
        where: { company_id: companyId, email: updateCustomerDto.email },
      });
      if (existingByEmail && existingByEmail.id !== id) {
        throw new BadRequestException('Customer with this email already exists');
      }
    }

    // Check phone uniqueness if changing
    if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
      const existingByPhone = await this.customerRepository.findOne({
        where: { company_id: companyId, phone: updateCustomerDto.phone },
      });
      if (existingByPhone && existingByPhone.id !== id) {
        throw new BadRequestException('Customer with this phone already exists');
      }
    }

    Object.assign(customer, updateCustomerDto);
    const updated = await this.customerRepository.save(customer);
    return this.toResponseDto(updated);
  }

  /**
   * Soft delete a customer (set is_active = false)
   */
  async remove(id: string, companyId: string): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    customer.is_active = false;
    await this.customerRepository.save(customer);
  }

  /**
   * Get customer purchase history (requires sales module integration)
   * For now, returns empty array - will be populated when sales records are linked
   */
  async getPurchaseHistory(
    id: string,
    companyId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const customer = await this.customerRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // TODO: Query sales table when sales module is integrated
    // For now, return placeholder
    return [];
  }

  /**
   * Update loyalty points
   */
  async updateLoyaltyPoints(
    id: string,
    updateLoyaltyDto: UpdateLoyaltyPointsDto,
    companyId: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const { points, operation } = updateLoyaltyDto;

    if (operation === 'add') {
      customer.loyalty_points += points;
    } else if (operation === 'subtract') {
      if (customer.loyalty_points < points) {
        throw new BadRequestException('Insufficient loyalty points');
      }
      customer.loyalty_points -= points;
    } else if (operation === 'set') {
      customer.loyalty_points = points;
    }

    const updated = await this.customerRepository.save(customer);
    return this.toResponseDto(updated);
  }

  /**
   * Get top customers by total purchases
   */
  async getTopCustomers(
    companyId: string,
    limit: number = 10,
  ): Promise<CustomerResponseDto[]> {
    const customers = await this.customerRepository.find({
      where: { company_id: companyId, is_active: true },
      order: { total_purchases: 'DESC' },
      take: limit,
    });

    return customers.map((c) => this.toResponseDto(c));
  }

  /**
   * Get customer statistics
   */
  async getStats(companyId: string): Promise<CustomerStatsDto> {
    const qb = this.customerRepository.createQueryBuilder('customer');
    qb.where('customer.company_id = :companyId', { companyId });

    const [allCustomers, totalCustomers] = await qb.getManyAndCount();

    const activeCustomers = allCustomers.filter((c) => c.is_active).length;
    const inactiveCustomers = totalCustomers - activeCustomers;

    const totalLoyaltyPoints = allCustomers.reduce(
      (sum, c) => sum + (c.loyalty_points || 0),
      0,
    );

    const totalRevenue = allCustomers.reduce(
      (sum, c) => sum + (c.total_purchases || 0),
      0,
    );

    const avgPurchaseValue =
      activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

    // Calculate customers with recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCustomers = allCustomers.filter(
      (c) => c.last_purchase_date && c.last_purchase_date >= thirtyDaysAgo,
    ).length;

    return {
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      totalLoyaltyPoints,
      avgPurchaseValue,
      recentCustomers,
    };
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(
    query: CustomerQueryDto,
    companyId: string,
  ): Promise<CustomerResponseDto[]> {
    const qb = this.customerRepository.createQueryBuilder('customer');
    qb.where('customer.company_id = :companyId', { companyId });

    if (query.search) {
      qb.andWhere(
        '(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.isActive !== undefined) {
      qb.andWhere('customer.is_active = :isActive', { isActive: query.isActive });
    }

    if (query.minLoyaltyPoints !== undefined) {
      qb.andWhere('customer.loyalty_points >= :minLoyaltyPoints', {
        minLoyaltyPoints: query.minLoyaltyPoints,
      });
    }

    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'DESC';
    const orderColumn =
      sortBy === 'name'
        ? 'customer.name'
        : sortBy === 'total_purchases'
        ? 'customer.total_purchases'
        : sortBy === 'loyalty_points'
        ? 'customer.loyalty_points'
        : 'customer.created_at';

    qb.orderBy(orderColumn, sortOrder);
    qb.limit(100); // Max 100 results for advanced search

    const customers = await qb.getMany();
    return customers.map((c) => this.toResponseDto(c));
  }

  /**
   * Internal: Update purchase stats (called from sales module)
   */
  async updatePurchaseStats(
    customerId: string,
    companyId: string,
    purchaseAmount: number,
  ): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, company_id: companyId },
    });

    if (!customer) {
      return; // Silent fail if customer not found
    }

    customer.total_purchases += purchaseAmount;
    customer.last_purchase_date = new Date();
    await this.customerRepository.save(customer);
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(customer: Customer): CustomerResponseDto {
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
}
