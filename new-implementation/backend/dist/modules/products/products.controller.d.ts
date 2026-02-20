import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { User } from '../auth/entities/user.entity';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(user: User, query: ProductQueryDto): Promise<{
        data: ProductResponseDto[];
        meta: any;
    }>;
    findOne(id: string, user: User): Promise<ProductResponseDto>;
    create(createProductDto: CreateProductDto, user: User): Promise<ProductResponseDto>;
    update(id: string, updateProductDto: UpdateProductDto, user: User): Promise<ProductResponseDto>;
    remove(id: string, user: User): Promise<void>;
}
