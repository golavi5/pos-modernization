import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../entities/settings.entity';
import {
  UpdateCompanyDto,
  UpdateTaxDto,
  UpdatePaymentMethodsDto,
  UpdateInventorySettingsDto,
  UpdateSalesSettingsDto,
  UpdateLoyaltySettingsDto,
} from '../dto/settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
  ) {}

  /**
   * Get all settings for a company.
   * Creates default settings if none exist.
   */
  async getSettings(companyId: string): Promise<Settings> {
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

  /**
   * Update company information
   */
  async updateCompany(companyId: string, dto: UpdateCompanyDto): Promise<Settings> {
    const settings = await this.getSettings(companyId);
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  /**
   * Update tax configuration
   */
  async updateTax(companyId: string, dto: UpdateTaxDto): Promise<Settings> {
    const settings = await this.getSettings(companyId);
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  /**
   * Update payment methods
   */
  async updatePaymentMethods(companyId: string, dto: UpdatePaymentMethodsDto): Promise<Settings> {
    const settings = await this.getSettings(companyId);
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  /**
   * Update inventory settings
   */
  async updateInventory(companyId: string, dto: UpdateInventorySettingsDto): Promise<Settings> {
    const settings = await this.getSettings(companyId);
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  /**
   * Update sales settings
   */
  async updateSales(companyId: string, dto: UpdateSalesSettingsDto): Promise<Settings> {
    const settings = await this.getSettings(companyId);
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  /**
   * Update loyalty program settings
   */
  async updateLoyalty(companyId: string, dto: UpdateLoyaltySettingsDto): Promise<Settings> {
    const settings = await this.getSettings(companyId);
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  /**
   * Reset all settings to defaults
   */
  async resetToDefaults(companyId: string): Promise<Settings> {
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
}
