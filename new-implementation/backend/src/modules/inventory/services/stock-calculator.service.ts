import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseLocation } from '../entities/warehouse-location.entity';
import { StockMovement, MovementType } from '../entities/stock-movement.entity';

@Injectable()
export class StockCalculatorService {
  constructor(
    @InjectRepository(WarehouseLocation)
    private locationRepository: Repository<WarehouseLocation>,
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
  ) {}

  async calculateCurrentStock(
    productId: string,
    locationId: string,
  ): Promise<number> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
    });

    if (!location) {
      return 0;
    }

    const movements = await this.movementRepository.find({
      where: {
        product_id: productId,
        location_id: locationId,
      },
    });

    let stock = 0;
    for (const movement of movements) {
      if (
        movement.movement_type === MovementType.IN ||
        movement.movement_type === MovementType.RETURN
      ) {
        stock += movement.quantity;
      } else {
        stock -= movement.quantity;
      }
    }

    return Math.max(0, stock);
  }

  async getTotalStockByProduct(
    productId: string,
    companyId: string,
  ): Promise<number> {
    const locations = await this.locationRepository.find({
      where: { company_id: companyId },
    });

    let totalStock = 0;
    for (const location of locations) {
      const stock = await this.calculateCurrentStock(productId, location.id);
      totalStock += stock;
    }

    return totalStock;
  }
}
