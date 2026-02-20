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
exports.ProductCategoriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_category_entity_1 = require("./entities/product-category.entity");
let ProductCategoriesService = class ProductCategoriesService {
    constructor(categoryRepository) {
        this.categoryRepository = categoryRepository;
    }
    async findAll(company_id) {
        const categories = await this.categoryRepository.find({
            where: { company_id },
            order: { name: 'ASC' },
        });
        return categories;
    }
    async findOne(id, company_id) {
        const category = await this.categoryRepository.findOne({
            where: { id, company_id },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID ${id} not found`);
        }
        return category;
    }
    async create(createCategoryDto, user) {
        if (createCategoryDto.company_id !== user.company_id) {
            throw new common_1.UnauthorizedException('Cannot create category for another company');
        }
        if (createCategoryDto.parent_id) {
            const parentCategory = await this.categoryRepository.findOne({
                where: { id: createCategoryDto.parent_id, company_id: user.company_id },
            });
            if (!parentCategory) {
                throw new common_1.NotFoundException(`Parent category with ID ${createCategoryDto.parent_id} not found`);
            }
        }
        const category = this.categoryRepository.create({
            ...createCategoryDto,
            company_id: user.company_id,
        });
        return await this.categoryRepository.save(category);
    }
    async update(id, updateData, user) {
        const category = await this.categoryRepository.findOne({
            where: { id, company_id: user.company_id },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category with ID ${id} not found`);
        }
        if (updateData.parent_id && updateData.parent_id === id) {
            throw new common_1.BadRequestException('Category cannot be a parent of itself');
        }
        if (updateData.parent_id) {
            const parentCategory = await this.categoryRepository.findOne({
                where: { id: updateData.parent_id, company_id: user.company_id },
            });
            if (!parentCategory) {
                throw new common_1.NotFoundException(`Parent category with ID ${updateData.parent_id} not found`);
            }
        }
        Object.assign(category, updateData);
        return await this.categoryRepository.save(category);
    }
};
exports.ProductCategoriesService = ProductCategoriesService;
exports.ProductCategoriesService = ProductCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_category_entity_1.ProductCategory)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProductCategoriesService);
//# sourceMappingURL=product-categories.service.js.map