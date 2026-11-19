import { MigrationInterface, QueryRunner } from 'typeorm';

/** SPEC-FISC-003 T-06: API-emitted documents (invoice, credit note) share the outbox; numbering per document type. */
export class FiscalDocumentsApi1782500000000 implements MigrationInterface {
  name = 'FiscalDocumentsApi1782500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE \`fiscal_emission_outbox\` ADD \`document_type\` varchar(16) NOT NULL DEFAULT 'pos'`);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` ADD \`invoice_prefix\` varchar(16) NULL`);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` ADD \`invoice_resolution\` varchar(32) NULL`);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` ADD \`credit_note_prefix\` varchar(16) NULL`);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` ADD \`credit_note_resolution\` varchar(32) NULL`);
    await q.query(`ALTER TABLE \`fiscal_emission_outbox\` CHANGE \`order_id\` \`order_id\` char(36) NULL`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE \`fiscal_emission_outbox\` CHANGE \`order_id\` \`order_id\` char(36) NOT NULL`);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` DROP COLUMN \`credit_note_resolution\``);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` DROP COLUMN \`credit_note_prefix\``);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` DROP COLUMN \`invoice_resolution\``);
    await q.query(`ALTER TABLE \`fiscal_plemsi_config\` DROP COLUMN \`invoice_prefix\``);
    await q.query(`ALTER TABLE \`fiscal_emission_outbox\` DROP COLUMN \`document_type\``);
  }
}
