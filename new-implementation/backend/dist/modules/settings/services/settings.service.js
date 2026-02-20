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
var SettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const settings_entity_1 = require("../entities/settings.entity");
let SettingsService = SettingsService_1 = class SettingsService {
    constructor(settingsRepo) {
        this.settingsRepo = settingsRepo;
        this.logger = new common_1.Logger(SettingsService_1.name);
    }
    async getSettings(companyId) {
        let settings = await this.settingsRepo.findOne({ where: { companyId } });
        if (!settings) {
            this.logger.log(`Creating default settings for company ${companyId}`);
            settings = this.settingsRepo.create({
                companyId,
                companyName: 'Mi Empresa',
                currency: 'COP',
                locale: 'es-CO',
                taxRate: 19,
                taxIncludedInPrice: true,
                paymentCash: true,
                paymentCard: true,
                paymentTransfer: true,
                paymentCredit: false,
                trackInventory: true,
                allowNegativeStock: false,
                defaultReorderPoint: 5,
                requireCustomer: false,
                printReceiptAutomatically: false,
                largeSaleThreshold: 500000,
                loyaltyEnabled: true,
                loyaltyPointsPerCurrency: 1,
                loyaltyPointValue: 0.01,
            });
            settings = await this.settingsRepo.save(settings);
        }
        return settings;
    }
    async updateCompany(companyId, dto) {
        const settings = await this.getSettings(companyId);
        Object.assign(settings, dto);
        return this.settingsRepo.save(settings);
    }
    async updateTax(companyId, dto) {
        const settings = await this.getSettings(companyId);
        Object.assign(settings, dto);
        return this.settingsRepo.save(settings);
    }
    async updatePaymentMethods(companyId, dto) {
        const settings = await this.getSettings(companyId);
        Object.assign(settings, dto);
        return this.settingsRepo.save(settings);
    }
    async updateInventory(companyId, dto) {
        const settings = await this.getSettings(companyId);
        Object.assign(settings, dto);
        return this.settingsRepo.save(settings);
    }
    async updateSales(companyId, dto) {
        const settings = await this.getSettings(companyId);
        Object.assign(settings, dto);
        return this.settingsRepo.save(settings);
    }
    async updateLoyalty(companyId, dto) {
        const settings = await this.getSettings(companyId);
        Object.assign(settings, dto);
        return this.settingsRepo.save(settings);
    }
    async resetToDefaults(companyId) {
        const settings = await this.getSettings(companyId);
        Object.assign(settings, {
            currency: 'COP',
            locale: 'es-CO',
            taxRate: 19,
            taxIncludedInPrice: true,
            paymentCash: true,
            paymentCard: true,
            paymentTransfer: true,
            paymentCredit: false,
            paymentTransferInstructions: null,
            trackInventory: true,
            allowNegativeStock: false,
            defaultReorderPoint: 5,
            requireCustomer: false,
            printReceiptAutomatically: false,
            receiptFooter: null,
            largeSaleThreshold: 500000,
            loyaltyEnabled: true,
            loyaltyPointsPerCurrency: 1,
            loyaltyPointValue: 0.01,
        });
        this.logger.log(`Settings reset to defaults for company ${companyId}`);
        return this.settingsRepo.save(settings);
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = SettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SettingsService);
//# sourceMappingURL=settings.service.js.map