import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { CustomerStatsDto } from './dto/customer-stats.dto';
import { UpdateLoyaltyPointsDto } from './dto/loyalty.dto';
export declare class CustomersService {
    private readonly customerRepository;
    constructor(customerRepository: Repository<Customer>);
    create(createCustomerDto: CreateCustomerDto, companyId: string): Promise<CustomerResponseDto>;
    findAll(query: CustomerQueryDto, companyId: string): Promise<{
        data: CustomerResponseDto[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    findOne(id: string, companyId: string): Promise<CustomerResponseDto>;
    update(id: string, updateCustomerDto: UpdateCustomerDto, companyId: string): Promise<CustomerResponseDto>;
    remove(id: string, companyId: string): Promise<void>;
    getPurchaseHistory(id: string, companyId: string, limit?: number): Promise<any[]>;
    updateLoyaltyPoints(id: string, updateLoyaltyDto: UpdateLoyaltyPointsDto, companyId: string): Promise<CustomerResponseDto>;
    getTopCustomers(companyId: string, limit?: number): Promise<CustomerResponseDto[]>;
    getStats(companyId: string): Promise<CustomerStatsDto>;
    advancedSearch(query: CustomerQueryDto, companyId: string): Promise<CustomerResponseDto[]>;
    updatePurchaseStats(customerId: string, companyId: string, purchaseAmount: number): Promise<void>;
    private toResponseDto;
}
