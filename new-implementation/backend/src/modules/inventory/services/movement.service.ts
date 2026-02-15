import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StockMovement, MovementType } from '../entities/stock-movement.entity';
import { MovementQueryDto } from '../dto/movement-query.dto';
import { WarehouseLocation } from '../entities/warehouse-location.entity';
import { User } from '../../auth/entities/user.entity';

interface CurrentUser extends User {
  company_id: string;
}

@Injectable()
export class MovementService {
  constructor(
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    @InjectRepository(WarehouseLocation)
    private locationRepository: Repository<WarehouseLocation>,
  ) {}

  async listMovements(
    query: MovementQueryDto,
    user: CurrentUser,
  ): Promise<{ movements: StockMovement[]; total: number }> {
    const where: any = { company_id: user.company_id };

    if (query.product_id) {
      where.product_id = query.product_id;
    }
    if (query.location_id) {
      where.location_id = query.location_id;
    }
    if (query.movement_type) {
      where.movement_type = query.movement_type;
    }
    if (query.start_date && query.end_date) {
      where.created_at = Between(
        new Date(query.start_date),
        new Date(query.end_date),
      );
    }

    const [movements, total] = await this.movementRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: ((query.page || 1) - 1) * (query.limit || 10),
      take: query.limit || 10,
    });

    return { movements, total };
  }

  async getMovementById(id: string, user: CurrentUser): Promise<StockMovement> {
    const movement = await this.movementRepository.findOne({
      where: { id, company_id: user.company_id },
      relations: ['location'],
    });

    if (!movement) {
      throw new NotFoundException('Movement not found');
    }

    return movement;
  }

  async recordMovement(
    productId: string,
    locationId: string,
    movementType: MovementType,
    quantity: number,
    user: CurrentUser,
    referenceId?: string,
    notes?: string,
  ): Promise<StockMovement> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId, company_id: user.company_id },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const movement = this.movementRepository.create({
      product_id: productId,
      location_id: locationId,
      company_id: user.company_id,
      movement_type: movementType,
      quantity,
      reference_id: referenceId,
      notes,
      created_by: user.id,
    });

    return await this.movementRepository.save(movement);
  }
}
