import { Repository } from 'typeorm';
import { Settings } from '../entities/settings.entity';
import { UpdateCompanyDto, UpdateTaxDto, UpdatePaymentMethodsDto, UpdateInventorySettingsDto, UpdateSalesSettingsDto, UpdateLoyaltySettingsDto } from '../dto/settings.dto';
export declare class SettingsService {
    private readonly settingsRepo;
    private readonly logger;
    constructor(settingsRepo: Repository<Settings>);
    getSettings(companyId: string): Promise<Settings>;
    updateCompany(companyId: string, dto: UpdateCompanyDto): Promise<Settings>;
    updateTax(companyId: string, dto: UpdateTaxDto): Promise<Settings>;
    updatePaymentMethods(companyId: string, dto: UpdatePaymentMethodsDto): Promise<Settings>;
    updateInventory(companyId: string, dto: UpdateInventorySettingsDto): Promise<Settings>;
    updateSales(companyId: string, dto: UpdateSalesSettingsDto): Promise<Settings>;
    updateLoyalty(companyId: string, dto: UpdateLoyaltySettingsDto): Promise<Settings>;
    resetToDefaults(companyId: string): Promise<Settings>;
}
