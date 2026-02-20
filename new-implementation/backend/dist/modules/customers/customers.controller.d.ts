import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { UpdateLoyaltyPointsDto } from './dto/loyalty.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(createCustomerDto: CreateCustomerDto, user: any): Promise<import("./dto/customer-response.dto").CustomerResponseDto>;
    findAll(query: CustomerQueryDto, user: any): Promise<{
        data: import("./dto/customer-response.dto").CustomerResponseDto[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getStats(user: any): Promise<import("./dto/customer-stats.dto").CustomerStatsDto>;
    getTopCustomers(limit: string, user: any): Promise<import("./dto/customer-response.dto").CustomerResponseDto[]>;
    advancedSearch(query: CustomerQueryDto, user: any): Promise<import("./dto/customer-response.dto").CustomerResponseDto[]>;
    findOne(id: string, user: any): Promise<import("./dto/customer-response.dto").CustomerResponseDto>;
    getPurchaseHistory(id: string, limit: string, user: any): Promise<any[]>;
    update(id: string, updateCustomerDto: UpdateCustomerDto, user: any): Promise<import("./dto/customer-response.dto").CustomerResponseDto>;
    updateLoyalty(id: string, updateLoyaltyDto: UpdateLoyaltyPointsDto, user: any): Promise<import("./dto/customer-response.dto").CustomerResponseDto>;
    remove(id: string, user: any): Promise<void>;
}
