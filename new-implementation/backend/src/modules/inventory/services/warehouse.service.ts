import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../entities/warehouse.entity';
import { WarehouseLocation } from '../entities/warehouse-location.entity';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { CreateLocationDto } from '../dto/create-location.dto';
import { User } from '../../auth/entities/user.entity';

interface CurrentUser extends User {
  company_id: string;
}

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    @InjectRepository(WarehouseLocation)
    private locationRepository: Repository<WarehouseLocation>,
  ) {}

  async listWarehouses(user: CurrentUser): Promise<Warehouse[]> {
    return await this.warehouseRepository.find({
      where: { company_id: user.company_id, is_active: true },
      relations: ['locations'],
    });
  }

  async getWarehouseById(id: string, user: CurrentUser): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id, company_id: user.company_id },
      relations: ['locations'],
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return warehouse;
  }

  async createWarehouse(
    dto: CreateWarehouseDto,
    user: CurrentUser,
  ): Promise<Warehouse> {
    const warehouse = this.warehouseRepository.create({
      ...dto,
      company_id: user.company_id,
    });

    return await this.warehouseRepository.save(warehouse);
  }

  async updateWarehouse(
    id: string,
    dto: Partial<CreateWarehouseDto>,
    user: CurrentUser,
  ): Promise<Warehouse> {
    const warehouse = await this.getWarehouseById(id, user);

    Object.assign(warehouse, dto);

    return await this.warehouseRepository.save(warehouse);
  }

  async createLocation(
    dto: CreateLocationDto,
    user: CurrentUser,
  ): Promise<WarehouseLocation> {
    const warehouse = await this.getWarehouseById(dto.warehouse_id, user);

    if (!warehouse) {
      throw new BadRequestException('Warehouse not found');
    }

    const location = this.locationRepository.create({
      ...dto,
      company_id: user.company_id,
    });

    return await this.locationRepository.save(location);
  }

  async updateLocation(
    id: string,
    dto: Partial<CreateLocationDto>,
    user: CurrentUser,
  ): Promise<WarehouseLocation> {
    const location = await this.locationRepository.findOne({
      where: { id, company_id: user.company_id },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    Object.assign(location, dto);

    return await this.locationRepository.save(location);
  }

  async listLocations(warehouseId: string, user: CurrentUser): Promise<WarehouseLocation[]> {
    return await this.locationRepository.find({
      where: {
        warehouse_id: warehouseId,
        company_id: user.company_id,
        is_active: true,
      },
    });
  }
}
