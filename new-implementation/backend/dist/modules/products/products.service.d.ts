import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { User } from '../auth/entities/user.entity';
export declare class ProductsService {
    private productRepository;
    constructor(productRepository: Repository<Product>);
    findAll(user: User, query: ProductQueryDto): Promise<{
        data: Product[];
        meta: {
            total: number;
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    findOne(id: string, user: User): Promise<Product>;
    create(createProductDto: CreateProductDto, user: User): Promise<Product>;
    update(id: string, updateProductDto: UpdateProductDto, user: User): Promise<Product>;
    remove(id: string, user: User): Promise<Product>;
    checkReorderLevels(user: User): Promise<Product[]>;
    deductStock(productId: string, quantity: number, user: User): Promise<Product>;
    addStock(productId: string, quantity: number, user: User): Promise<Product>;
}
