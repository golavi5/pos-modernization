"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const products_controller_1 = require("./products.controller");
const products_service_1 = require("./products.service");
const product_categories_controller_1 = require("./product-categories.controller");
const product_categories_service_1 = require("./product-categories.service");
const product_entity_1 = require("./entities/product.entity");
const product_category_entity_1 = require("./entities/product-category.entity");
let ProductsModule = class ProductsModule {
};
exports.ProductsModule = ProductsModule;
exports.ProductsModule = ProductsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([product_entity_1.Product, product_category_entity_1.ProductCategory]),
        ],
        controllers: [
            products_controller_1.ProductsController,
            product_categories_controller_1.ProductCategoriesController,
        ],
        providers: [
            products_service_1.ProductsService,
            product_categories_service_1.ProductCategoriesService,
        ],
        exports: [
            products_service_1.ProductsService,
            product_categories_service_1.ProductCategoriesService,
        ],
    })
], ProductsModule);
//# sourceMappingURL=products.module.js.map