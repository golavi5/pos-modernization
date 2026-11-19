import { MigrationInterface, QueryRunner } from 'typeorm';

/** SPEC-FISC-003 T-02: per-issuer Plemsi credentials (token envelope-encrypted). */
export class CreateFiscalPlemsiConfig1782200000000 implements MigrationInterface {
  name = 'CreateFiscalPlemsiConfig1782200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE \`fiscal_plemsi_config\` (\`id\` varchar(36) NOT NULL, \`company_id\` char(36) NOT NULL, \`environment\` varchar(16) NOT NULL, \`wrapped_data_key\` text NOT NULL, \`token_encrypted\` text NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_57910e879f79c706ecaaf6cb60\` (\`company_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE \`fiscal_plemsi_config\``);
  }
}
