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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("./entities/product.entity");
let ProductsService = class ProductsService {
    constructor(productRepository) {
        this.productRepository = productRepository;
    }
    async findAll(user, query) {
        const { offset = 0, limit = 10, search, category_id, sort, order, is_active } = query;
        const where = {
            company_id: user.company_id,
        };
        if (category_id) {
            where.category_id = category_id;
        }
        if (is_active !== undefined) {
            where.is_active = is_active;
        }
        if (search) {
            where.name = (0, typeorm_2.ILike)(`%${search}%`);
        }
        const [products, total] = await this.productRepository.findAndCount({
            where,
            skip: offset,
            take: limit,
            order: { [sort]: order },
        });
        return {
            data: products,
            meta: {
                total,
                offset,
                limit,
                hasMore: total > offset + limit,
            },
        };
    }
    async findOne(id, user) {
        const product = await this.productRepository.findOne({
            where: { id, company_id: user.company_id },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        return product;
    }
    async create(createProductDto, user) {
        const existingProductBySku = await this.productRepository.findOne({
            where: { sku: createProductDto.sku, company_id: user.company_id },
        });
        if (existingProductBySku) {
            throw new common_1.ConflictException(`Product with SKU ${createProductDto.sku} already exists`);
        }
        if (createProductDto.barcode) {
            const existingProductByBarcode = await this.productRepository.findOne({
                where: { barcode: createProductDto.barcode, company_id: user.company_id },
            });
            if (existingProductByBarcode) {
                throw new common_1.ConflictException(`Product with barcode ${createProductDto.barcode} already exists`);
            }
        }
        if (createProductDto.company_id !== user.company_id) {
            throw new common_1.UnauthorizedException('Cannot create product for another company');
        }
        const product = this.productRepository.create({
            ...createProductDto,
            created_by: user.id,
        });
        return await this.productRepository.save(product);
    }
    async update(id, updateProductDto, user) {
        const product = await this.productRepository.findOne({
            where: { id, company_id: user.company_id },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
            const existingProduct = await this.productRepository.findOne({
                where: { sku: updateProductDto.sku, company_id: user.company_id },
            });
            if (existingProduct) {
                throw new common_1.ConflictException(`Product with SKU ${updateProductDto.sku} already exists`);
            }
        }
        if (updateProductDto.barcode && updateProductDto.barcode !== product.barcode) {
            const existingProduct = await this.productRepository.findOne({
                where: { barcode: updateProductDto.barcode, company_id: user.company_id },
            });
            if (existingProduct) {
                throw new common_1.ConflictException(`Product with barcode ${updateProductDto.barcode} already exists`);
            }
        }
        Object.assign(product, updateProductDto);
        return await this.productRepository.save(product);
    }
    async remove(id, user) {
        const product = await this.productRepository.findOne({
            where: { id, company_id: user.company_id },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        product.deleted_at = new Date();
        product.is_active = false;
        return await this.productRepository.save(product);
    }
    async checkReorderLevels(user) {
        const lowStockProducts = await this.productRepository
            .createQueryBuilder('product')
            .where('product.company_id = :companyId', { companyId: user.company_id })
            .andWhere('product.stock_quantity <= product.reorder_level')
            .andWhere('product.is_active = :isActive', { isActive: true })
            .getMany();
        return lowStockProducts;
    }
    async deductStock(productId, quantity, user) {
        const product = await this.findOne(productId, user);
        if (product.stock_quantity < quantity) {
            throw new common_1.BadRequestException(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${quantity}`);
        }
        product.stock_quantity -= quantity;
        return await this.productRepository.save(product);
    }
    async addStock(productId, quantity, user) {
        const product = await this.findOne(productId, user);
        product.stock_quantity += quantity;
        return await this.productRepository.save(product);
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProductsService);
//# sourceMappingURL=products.service.js.map