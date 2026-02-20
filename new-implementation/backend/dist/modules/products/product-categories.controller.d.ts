import { ProductCategoriesService } from './product-categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { User } from '../auth/entities/user.entity';
export declare class ProductCategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: ProductCategoriesService);
    findAll(user: User): Promise<CategoryResponseDto[]>;
    create(createCategoryDto: CreateCategoryDto, user: User): Promise<CategoryResponseDto>;
    update(id: string, updateData: Partial<CategoryResponseDto>, user: User): Promise<CategoryResponseDto>;
}
