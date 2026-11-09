import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { StockMovement, MovementType } from '../entities/stock-movement.entity';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { StockQueryDto } from '../dto/stock-query.dto';
import { StockLevelDto, StockPageDto } from '../dto/stock-level.dto';
import { InventoryLocationsService } from './inventory-locations.service';
import { User } from '../../auth/entities/user.entity';

interface CurrentUser extends User {
  company_id: string;
}

const toLevel = (p: Product): StockLevelDto => ({
  id: p.id,
  product_id: p.id,
  product_name: p.name,
  product_sku: p.sku,
  quantity: p.stock_quantity,
  reorder_level: p.reorder_level,
});

/**
 * SPEC-BACK-007: `products.stock_quantity` is the single source of truth and
 * `stock_movements` is its delta journal. Nothing here reads or writes
 * `warehouse_locations.current_stock`.
 */
@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
    private locations: InventoryLocationsService,
  ) {}

  async getCurrentStock(
    query: StockQueryDto,
    user: CurrentUser,
  ): Promise<StockPageDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const qb = this.productRepository
      .createQueryBuilder('p')
      .where('p.company_id = :companyId', { companyId: user.company_id });
    if (query.search) {
      qb.andWhere('(p.name LIKE :s OR p.sku LIKE :s)', { s: `%${query.search}%` });
    }
    if (query.low_stock) {
      qb.andWhere('p.stock_quantity <= p.reorder_level');
    }
    const [products, total] = await qb
      .orderBy('p.name', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data: products.map(toLevel), total, page, pageSize };
  }

  async getStockByProduct(
    productId: string,
    user: CurrentUser,
  ): Promise<StockLevelDto> {
    const product = await this.productRepository.findOne({
      where: { id: productId, company_id: user.company_id },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return toLevel(product);
  }

  /**
   * Manual adjustment: changes `stock_quantity` and writes exactly one journal
   * row in the same transaction, under a lock on the product. IN and RETURN
   * raise stock; OUT, ADJUST and DAMAGE lower it. A manual decrement may not
   * cross zero — only a sale takes stock negative.
   */
  async adjustStock(
    dto: AdjustStockDto,
    user: CurrentUser,
  ): Promise<StockMovement> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: dto.product_id, company_id: user.company_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const raises =
        dto.movement_type === MovementType.IN ||
        dto.movement_type === MovementType.RETURN;
      const newStock = product.stock_quantity + (raises ? dto.quantity : -dto.quantity);
      if (!raises && newStock < 0) {
        throw new BadRequestException('Insufficient stock for this operation');
      }

      const locationId = await this.locations.ensureDefaultLocation(
        user.company_id,
        manager,
      );
      product.stock_quantity = newStock;
      await manager.save(Product, product);

      return manager.save(
        StockMovement,
        manager.create(StockMovement, {
          product_id: dto.product_id,
          location_id: locationId,
          company_id: user.company_id,
          movement_type: dto.movement_type,
          quantity: dto.quantity,
          reference_id: dto.reference_id,
          notes: dto.notes,
          created_by: user.id,
        }),
      );
    });

    this.logger.log(`Stock adjusted: ${dto.product_id} (${dto.movement_type} ${dto.quantity}) by ${user.id}`);
    return saved;
  }
}
