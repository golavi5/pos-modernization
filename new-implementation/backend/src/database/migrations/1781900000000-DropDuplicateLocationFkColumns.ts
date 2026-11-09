import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `ManyToOne` without `@JoinColumn` made TypeORM invent `stock_movements.locationId`
 * and `warehouse_locations.warehouseId`, always-NULL duplicates of the real
 * `location_id` / `warehouse_id` columns, and the initial schema put the FKs on
 * the duplicates. The entities now join on the real columns (no DB FK, see the
 * entity comments), so the duplicates and their FKs go.
 */
export class DropDuplicateLocationFkColumns1781900000000 implements MigrationInterface {
  name = 'DropDuplicateLocationFkColumns1781900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE `stock_movements` DROP FOREIGN KEY `FK_50fab165d7aa9fea5f749b1574c`');
    await q.query('ALTER TABLE `stock_movements` DROP COLUMN `locationId`');
    await q.query('ALTER TABLE `warehouse_locations` DROP FOREIGN KEY `FK_ac9f8443edc269de2443e3bf25b`');
    await q.query('ALTER TABLE `warehouse_locations` DROP COLUMN `warehouseId`');
  }

  public async down(q: QueryRunner): Promise<void> {
    // Schema only: the columns were always NULL, so nothing is lost.
    await q.query('ALTER TABLE `warehouse_locations` ADD `warehouseId` varchar(36) NULL');
    await q.query(
      'ALTER TABLE `warehouse_locations` ADD CONSTRAINT `FK_ac9f8443edc269de2443e3bf25b` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await q.query('ALTER TABLE `stock_movements` ADD `locationId` varchar(36) NULL');
    await q.query(
      'ALTER TABLE `stock_movements` ADD CONSTRAINT `FK_50fab165d7aa9fea5f749b1574c` FOREIGN KEY (`locationId`) REFERENCES `warehouse_locations`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }
}
