import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseLocation } from '../entities/warehouse-location.entity';
import { StockMovement, MovementType } from '../entities/stock-movement.entity';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { StockQueryDto } from '../dto/stock-query.dto';
import { StockCalculatorService } from './stock-calculator.service';
import { User } from '../../auth/entities/user.entity';

interface CurrentUser extends User {
  company_id: string;
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    @InjectRepository(WarehouseLocation)
    private locationRepository: Repository<WarehouseLocation>,
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    private stockCalculator: StockCalculatorService,
  ) {}

  async getCurrentStock(user: CurrentUser): Promise<any> {
    const locations = await this.locationRepository.find({
      where: { company_id: user.company_id, is_active: true },
    });

    const stock = [];
    for (const location of locations) {
      stock.push({
        location_id: location.id,
        location_code: location.location_code,
        current_stock: location.current_stock,
        capacity: location.capacity,
        available_capacity: location.capacity - location.current_stock,
      });
    }

    return stock;
  }

  async getStockByProduct(
    productId: string,
    user: CurrentUser,
  ): Promise<any> {
    const locations = await this.locationRepository.find({
      where: { company_id: user.company_id, is_active: true },
    });

    const stock = [];
    for (const location of locations) {
      const quantity = await this.stockCalculator.calculateCurrentStock(
        productId,
        location.id,
      );

      if (quantity > 0) {
        stock.push({
          location_id: location.id,
          location_code: location.location_code,
          quantity,
        });
      }
    }

    return stock;
  }

  async adjustStock(
    dto: AdjustStockDto,
    user: CurrentUser,
  ): Promise<StockMovement> {
    const location = await this.locationRepository.findOne({
      where: { id: dto.location_id, company_id: user.company_id },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    // Calculate new stock level
    let newStock = location.current_stock;
    if (
      dto.movement_type === MovementType.IN ||
      dto.movement_type === MovementType.RETURN
    ) {
      newStock += dto.quantity;
    } else {
      newStock -= dto.quantity;
    }

    if (newStock < 0) {
      throw new BadRequestException(
        'Insufficient stock for this operation',
      );
    }

    if (newStock > location.capacity) {
      throw new BadRequestException(
        'Stock exceeds location capacity',
      );
    }

    // Record movement
    const movement = this.movementRepository.create({
      product_id: dto.product_id,
      location_id: dto.location_id,
      company_id: user.company_id,
      movement_type: dto.movement_type,
      quantity: dto.quantity,
      reference_id: dto.reference_id,
      notes: dto.notes,
      created_by: user.id,
    });

    const saved = await this.movementRepository.save(movement);

    // Update location stock
    location.current_stock = newStock;
    await this.locationRepository.save(location);

    this.logger.log(
      `Stock adjusted: ${dto.product_id} in ${location.location_code} by ${user.id}`,
    );

    return saved;
  }

  async deductStockOnOrder(
    productId: string,
    quantity: number,
    user: CurrentUser,
    orderId: string,
  ): Promise<void> {
    const dto: AdjustStockDto = {
      product_id: productId,
      location_id: '', // Will be determined
      movement_type: MovementType.OUT,
      quantity,
      reference_id: orderId,
      notes: `Order ${orderId}`,
    };

    // Get first available location with enough stock
    const locations = await this.locationRepository.find({
      where: { company_id: user.company_id, is_active: true },
      order: { current_stock: 'DESC' },
    });

    for (const location of locations) {
      if (location.current_stock >= quantity) {
        dto.location_id = location.id;
        await this.adjustStock(dto, user);
        return;
      }
    }

    throw new BadRequestException('Insufficient stock available');
  }
}
