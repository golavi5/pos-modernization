import { MigrationInterface, QueryRunner } from 'typeorm';

/** SPEC-FISC-003 T-09: sales book table and the exact send moment on the outbox. */
export class FiscalSalesLedger1782600000000 implements MigrationInterface {
  name = 'FiscalSalesLedger1782600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE \`fiscal_ledger_sales\` (\`id\` varchar(36) NOT NULL, \`company_id\` char(36) NOT NULL, \`outbox_id\` char(36) NOT NULL, \`document_type\` varchar(16) NOT NULL, \`prefix\` varchar(16) NOT NULL, \`number\` int NOT NULL, \`cufe\` varchar(128) NULL, \`issued_at\` datetime(6) NOT NULL, \`issue_date\` char(10) NOT NULL, \`buyer_identification\` varchar(20) NULL, \`buyer_name\` varchar(255) NULL, \`base_total\` decimal(14,2) NOT NULL, \`tax_total\` decimal(14,2) NOT NULL, \`total\` decimal(14,2) NOT NULL, \`tax_breakdown\` json NOT NULL, \`sign\` tinyint NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_fiscal_ledger_company_date\` (\`company_id\`, \`issued_at\`), UNIQUE INDEX \`IDX_8e7d7fbf68cc4fbde7f358ff8e\` (\`outbox_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await q.query(`ALTER TABLE \`fiscal_emission_outbox\` ADD \`issued_at\` datetime(6) NULL`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE \`fiscal_emission_outbox\` DROP COLUMN \`issued_at\``);
    await q.query(`DROP INDEX \`IDX_8e7d7fbf68cc4fbde7f358ff8e\` ON \`fiscal_ledger_sales\``);
    await q.query(`DROP INDEX \`idx_fiscal_ledger_company_date\` ON \`fiscal_ledger_sales\``);
    await q.query(`DROP TABLE \`fiscal_ledger_sales\``);
  }
}
