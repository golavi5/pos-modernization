import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Warehouse } from '../entities/warehouse.entity';
import { WarehouseLocation } from '../entities/warehouse-location.entity';

/**
 * `stock_movements.location_id` es FK NOT NULL, y una empresa recién creada no
 * tiene bodegas. Esto las crea la primera vez que hacen falta.
 *
 * Bajo demanda y no en el arranque a propósito: las empresas se crean en
 * caliente (`POST /companies`), así que un bootstrap de boot dejaría sin
 * ubicación a toda empresa posterior — y el fallo aparecería en su primera
 * venta, no al desplegar.
 */
@Injectable()
export class InventoryLocationsService {
  static readonly DEFAULT_WAREHOUSE_NAME = 'Principal';
  static readonly DEFAULT_LOCATION_CODE = 'GENERAL';

  async ensureDefaultLocation(
    companyId: string,
    manager: EntityManager,
  ): Promise<string> {
    let warehouse = await manager.findOne(Warehouse, {
      where: { company_id: companyId },
    });

    if (!warehouse) {
      warehouse = await manager.save(
        Warehouse,
        manager.create(Warehouse, {
          company_id: companyId,
          name: InventoryLocationsService.DEFAULT_WAREHOUSE_NAME,
          is_active: true,
        }),
      );
    }

    const location = await manager.findOne(WarehouseLocation, {
      where: { company_id: companyId, warehouse_id: warehouse.id },
    });

    if (location) {
      return location.id;
    }

    const created = await manager.save(
      WarehouseLocation,
      manager.create(WarehouseLocation, {
        company_id: companyId,
        warehouse_id: warehouse.id,
        location_code: InventoryLocationsService.DEFAULT_LOCATION_CODE,
        capacity: 0,
        current_stock: 0,
      }),
    );

    return created.id;
  }
}
