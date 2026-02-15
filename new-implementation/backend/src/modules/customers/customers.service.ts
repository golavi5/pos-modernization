import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { User } from '../auth/entities/user.entity';

interface CurrentUser extends User {
  company_id: string;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async listCustomers(
    query: CustomerQueryDto,
    user: CurrentUser,
  ): Promise<{ customers: Customer[]; total: number }> {
    const where: any = {
      company_id: user.company_id,
      is_active: true,
    };

    if (query.search) {
      where.name = ILike(`%${query.search}%`);
    }

    const [customers, total] = await this.customerRepository.findAndCount({
      where,
      order: {
        [query.sort_by || 'created_at']: query.order || 'ASC',
      },
      skip: ((query.page || 1) - 1) * (query.limit || 10),
      take: query.limit || 10,
    });

    return { customers, total };
  }

  async getCustomerById(id: string, user: CurrentUser): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, company_id: user.company_id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async createCustomer(
    dto: CreateCustomerDto,
    user: CurrentUser,
  ): Promise<Customer> {
    // Check for duplicate email
    const existing = await this.customerRepository.findOne({
      where: { email: dto.email, company_id: user.company_id },
    });

    if (existing) {
      throw new ConflictException('Customer with this email already exists');
    }

    const customer = this.customerRepository.create({
      ...dto,
      company_id: user.company_id,
    });

    return await this.customerRepository.save(customer);
  }

  async updateCustomer(
    id: string,
    dto: UpdateCustomerDto,
    user: CurrentUser,
  ): Promise<Customer> {
    const customer = await this.getCustomerById(id, user);

    // Check email uniqueness if email is being updated
    if (dto.email && dto.email !== customer.email) {
      const existing = await this.customerRepository.findOne({
        where: { email: dto.email, company_id: user.company_id },
      });

      if (existing) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    Object.assign(customer, dto);

    return await this.customerRepository.save(customer);
  }

  async deleteCustomer(id: string, user: CurrentUser): Promise<{ message: string }> {
    const customer = await this.getCustomerById(id, user);

    customer.is_active = false;
    customer.deleted_at = new Date();

    await this.customerRepository.save(customer);

    return { message: `Customer ${customer.name} deleted successfully` };
  }

  async addLoyaltyPoints(
    id: string,
    points: number,
    user: CurrentUser,
  ): Promise<Customer> {
    const customer = await this.getCustomerById(id, user);

    customer.loyalty_points = Number(customer.loyalty_points) + points;

    return await this.customerRepository.save(customer);
  }

  async getTopCustomers(
    limit: number,
    user: CurrentUser,
  ): Promise<Customer[]> {
    return await this.customerRepository.find({
      where: { company_id: user.company_id, is_active: true },
      order: { total_purchases: 'DESC' },
      take: limit || 10,
    });
  }

  async searchCustomers(
    searchTerm: string,
    user: CurrentUser,
  ): Promise<Customer[]> {
    return await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.company_id = :company_id', { company_id: user.company_id })
      .andWhere('customer.is_active = :is_active', { is_active: true })
      .andWhere(
        '(customer.name ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${searchTerm}%` },
      )
      .getMany();
  }

  async updatePurchaseStats(
    customerId: string,
    orderTotal: number,
    user: CurrentUser,
  ): Promise<void> {
    const customer = await this.getCustomerById(customerId, user);

    customer.total_purchases = Number(customer.total_purchases) + orderTotal;
    customer.last_purchase_date = new Date();

    // Award loyalty points (1 point per dollar spent)
    const pointsEarned = Math.floor(orderTotal);
    customer.loyalty_points = Number(customer.loyalty_points) + pointsEarned;

    await this.customerRepository.save(customer);
  }
}
