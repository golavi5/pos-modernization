import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsService } from '../services/settings.service';
import { Settings } from '../entities/settings.entity';

describe('SettingsService', () => {
  let service: SettingsService;
  let repo: Repository<Settings>;

  const companyId = 'company-uuid';

  const mockSettings: Partial<Settings> = {
    id: 1,
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(Settings), useClass: Repository },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    repo = module.get<Repository<Settings>>(getRepositoryToken(Settings));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return existing settings', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockSettings as Settings);

      const result = await service.getSettings(companyId);

      expect(result.companyId).toBe(companyId);
      expect(result.currency).toBe('COP');
    });

    it('should create default settings when none exist', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      jest.spyOn(repo, 'create').mockReturnValue(mockSettings as Settings);
      jest.spyOn(repo, 'save').mockResolvedValue(mockSettings as Settings);

      const result = await service.getSettings(companyId);

      expect(result.currency).toBe('COP');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId, currency: 'COP' }),
      );
    });
  });

  describe('updateCompany', () => {
    it('should update company info and return updated settings', async () => {
      const updated = { ...mockSettings, companyName: 'Nueva Empresa' } as Settings;
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockSettings as Settings);
      jest.spyOn(repo, 'save').mockResolvedValue(updated);

      const result = await service.updateCompany(companyId, {
        companyName: 'Nueva Empresa',
      } as any);

      expect(result.companyName).toBe('Nueva Empresa');
    });
  });

  describe('updateTax', () => {
    it('should update tax settings', async () => {
      const updated = { ...mockSettings, taxRate: 0 } as Settings;
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockSettings as Settings);
      jest.spyOn(repo, 'save').mockResolvedValue(updated);

      const result = await service.updateTax(companyId, { taxRate: 0 } as any);

      expect(result.taxRate).toBe(0);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset settings to defaults and save', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockSettings as Settings);
      jest.spyOn(repo, 'save').mockResolvedValue(mockSettings as Settings);

      const result = await service.resetToDefaults(companyId);

      expect(result.currency).toBe('COP');
      expect(repo.save).toHaveBeenCalled();
    });
  });
});
