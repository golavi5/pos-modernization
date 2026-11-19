import { MigrationInterface, QueryRunner } from 'typeorm';

/** SPEC-FISC-003 T-04: transactional emission outbox + per-issuer emission switch and POS numbering. */
export class CreateFiscalEmissionOutbox1782300000000 implements MigrationInterface {
  name = 'CreateFiscalEmissionOutbox1782300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE \`fiscal_emission_outbox\` (\`id\` varchar(36) NOT NULL, \`company_id\` char(36) NOT NULL, \`order_id\` char(36) NOT NULL, \`status\` varchar(16) NOT NULL DEFAULT 'pending', \`draft\` json NULL, \`prefix\` varchar(16) NULL, \`number\` int NULL, \`resolution\` varchar(32) NULL, \`cufe\` varchar(128) NULL, \`qr\` text NULL, \`attempts\` int NOT NULL DEFAULT '0', \`next_attempt_at\` datetime(6) NOT NULL, \`last_error\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_fiscal_outbox_due\` (\`status\`, \`next_attempt_at\`), UNIQUE INDEX \`uq_fiscal_outbox_number\` (\`company_id\`, \`prefix\`, \`number\`), UNIQUE INDEX \`IDX_f369ce912d786b23edd67ca717\` (\`order_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` ADD \`emission_enabled\` tinyint NOT NULL DEFAULT 0`);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` ADD \`pos_prefix\` varchar(16) NULL`);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` ADD \`pos_resolution\` varchar(32) NULL`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` DROP COLUMN \`pos_resolution\``);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` DROP COLUMN \`pos_prefix\``);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` DROP COLUMN \`emission_enabled\``);
    await q.query(`DROP INDEX \`IDX_f369ce912d786b23edd67ca717\` ON \`fiscal_emission_outbox\``);
    await q.query(`DROP INDEX \`uq_fiscal_outbox_number\` ON \`fiscal_emission_outbox\``);
    await q.query(`DROP INDEX \`idx_fiscal_outbox_due\` ON \`fiscal_emission_outbox\``);
    await q.query(`DROP TABLE \`fiscal_emission_outbox\``);
  }
}
