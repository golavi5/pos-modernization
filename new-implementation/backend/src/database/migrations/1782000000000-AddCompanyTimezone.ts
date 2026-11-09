import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SPEC-BACK-008: per-company IANA timezone. Existing companies get America/Bogota
 * (the product's market), which moves their report day boundaries from UTC to
 * local time — the point of the change.
 */
export class AddCompanyTimezone1782000000000 implements MigrationInterface {
  name = 'AddCompanyTimezone1782000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      "ALTER TABLE `settings` ADD COLUMN `timezone` varchar(64) NOT NULL DEFAULT 'America/Bogota'",
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE `settings` DROP COLUMN `timezone`');
  }
}
