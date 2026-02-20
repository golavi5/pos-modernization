import { SettingsService } from './services/settings.service';
import { UpdateCompanyDto, UpdateTaxDto, UpdatePaymentMethodsDto, UpdateInventorySettingsDto, UpdateSalesSettingsDto, UpdateLoyaltySettingsDto } from './dto/settings.dto';
import { Settings } from './entities/settings.entity';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getSettings(user: any): Promise<Settings>;
    updateCompany(user: any, dto: UpdateCompanyDto): Promise<Settings>;
    updateTax(user: any, dto: UpdateTaxDto): Promise<Settings>;
    updatePaymentMethods(user: any, dto: UpdatePaymentMethodsDto): Promise<Settings>;
    updateInventory(user: any, dto: UpdateInventorySettingsDto): Promise<Settings>;
    updateSales(user: any, dto: UpdateSalesSettingsDto): Promise<Settings>;
    updateLoyalty(user: any, dto: UpdateLoyaltySettingsDto): Promise<Settings>;
    resetToDefaults(user: any): Promise<Settings>;
}
