import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = ['companies', 'customers', 'users', 'products', 'orders', 'order_items', 'payments'];

export class AddLegacyIdColumns1781600000000 implements MigrationInterface {
  name = 'AddLegacyIdColumns1781600000000';

  public async up(q: QueryRunner): Promise<void> {
    for (const t of TABLES) {
      await q.query(`ALTER TABLE \`${t}\` ADD COLUMN \`legacy_id\` VARCHAR(64) NULL`);
      await q.query(`CREATE UNIQUE INDEX \`UQ_${t}_legacy_id\` ON \`${t}\` (\`legacy_id\`)`);
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of [...TABLES].reverse()) {
      await q.query(`DROP INDEX \`UQ_${t}_legacy_id\` ON \`${t}\``);
      await q.query(`ALTER TABLE \`${t}\` DROP COLUMN \`legacy_id\``);
    }
  }
}
