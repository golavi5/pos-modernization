import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockCalculatorService } from './stock-calculator.service';
import { WarehouseLocation } from '../entities/warehouse-location.entity';

@Injectable()
export class ReorderAlertService {
  private readonly logger = new Logger(ReorderAlertService.name);

  constructor(
    @InjectRepository(WarehouseLocation)
    private locationRepository: Repository<WarehouseLocation>,
    private stockCalculator: StockCalculatorService,
  ) {}

  async checkReorderLevels(
    companyId: string,
    reorderThreshold: number = 10,
  ): Promise<Array<{ product_id: string; location_id: string; stock: number }>> {
    const locations = await this.locationRepository.find({
      where: { company_id: companyId, is_active: true },
    });

    const alerts: Array<{
      product_id: string;
      location_id: string;
      stock: number;
    }> = [];

    for (const location of locations) {
      if (location.current_stock <= reorderThreshold) {
        alerts.push({
          product_id: location.id,
          location_id: location.id,
          stock: location.current_stock,
        });
      }
    }

    if (alerts.length > 0) {
      this.logger.warn(`Reorder alerts: ${alerts.length} items low on stock`);
    }

    return alerts;
  }
}
