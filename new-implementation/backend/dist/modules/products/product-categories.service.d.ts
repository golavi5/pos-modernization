import { Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { User } from '../auth/entities/user.entity';
export declare class ProductCategoriesService {
    private categoryRepository;
    constructor(categoryRepository: Repository<ProductCategory>);
    findAll(company_id: string): Promise<ProductCategory[]>;
    findOne(id: string, company_id: string): Promise<ProductCategory>;
    create(createCategoryDto: CreateCategoryDto, user: User): Promise<ProductCategory>;
    update(id: string, updateData: Partial<ProductCategory>, user: User): Promise<ProductCategory>;
}
