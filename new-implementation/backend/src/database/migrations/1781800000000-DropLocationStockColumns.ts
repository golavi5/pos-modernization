import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SPEC-BACK-007: `products.stock_quantity` is the only stock ledger, so the
 * per-location counters are dead. Nothing working ever wrote `current_stock`
 * (the only writer rejected every operation: auto-created locations had
 * capacity 0), and `capacity` only gated that writer.
 */
export class DropLocationStockColumns1781800000000 implements MigrationInterface {
  name = 'DropLocationStockColumns1781800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE `warehouse_locations` DROP COLUMN `capacity`, DROP COLUMN `current_stock`',
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    // Restores the SCHEMA, not the values: the DROP in `up` is irreversible for
    // any `capacity` an admin set by hand on a location (the auto-created ones
    // were 0). Check `SELECT COUNT(*) FROM warehouse_locations WHERE capacity > 0`
    // before running `up` anywhere that matters.
    await q.query(
      "ALTER TABLE `warehouse_locations` ADD COLUMN `capacity` int NOT NULL DEFAULT 0, ADD COLUMN `current_stock` int NOT NULL DEFAULT 0",
    );
  }
}
