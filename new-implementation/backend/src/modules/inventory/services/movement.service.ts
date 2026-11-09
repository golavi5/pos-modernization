import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, In } from 'typeorm';
import { StockMovement } from '../entities/stock-movement.entity';
import { Product } from '../../products/entities/product.entity';
import { MovementQueryDto } from '../dto/movement-query.dto';
import { User } from '../../auth/entities/user.entity';

interface CurrentUser extends User {
  company_id: string;
}

@Injectable()
export class MovementService {
  constructor(
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async listMovements(
    query: MovementQueryDto,
    user: CurrentUser,
  ): Promise<{
    data: (StockMovement & { product_name?: string })[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: FindOptionsWhere<StockMovement> = { company_id: user.company_id };

    if (query.product_id) {
      where.product_id = query.product_id;
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const ids = [...new Set(movements.map((m) => m.product_id))];
    const products = ids.length
      ? await this.productRepository.find({
          where: { id: In(ids), company_id: user.company_id },
          withDeleted: true,
        })
      : [];
    const names = new Map(products.map((p) => [p.id, p.name]));

    return {
      data: movements.map((m) => ({ ...m, product_name: names.get(m.product_id) })),
      total,
      page,
      pageSize,
    };
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
}
