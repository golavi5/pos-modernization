import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SPEC-FISC-002: fiscal foundations — issuer profile, third parties, per-app API
 * keys and idempotency keys. Entities under modules/fiscal are the source of truth.
 */
export class CreateFiscalFoundations1782100000000 implements MigrationInterface {
  name = 'CreateFiscalFoundations1782100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE \`fiscal_third_parties\` (\`id\` varchar(36) NOT NULL, \`company_id\` char(36) NOT NULL, \`nit\` varchar(15) NOT NULL, \`dv\` char(1) NOT NULL, \`name\` varchar(255) NOT NULL, \`responsibility_codes\` json NOT NULL, \`notification_email\` varchar(255) NULL, \`customer_id\` char(36) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`uq_fiscal_third_party_nit\` (\`company_id\`, \`nit\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await q.query(`CREATE TABLE \`fiscal_profiles\` (\`id\` varchar(36) NOT NULL, \`company_id\` char(36) NOT NULL, \`nit\` varchar(15) NOT NULL, \`dv\` char(1) NOT NULL, \`legal_name\` varchar(255) NOT NULL, \`regime\` varchar(64) NULL, \`responsibility_codes\` json NOT NULL, \`habilitation_status\` varchar(32) NOT NULL DEFAULT 'none', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_8e53507d5d115c01701936b48c\` (\`company_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await q.query(`CREATE TABLE \`fiscal_idempotency_keys\` (\`id\` varchar(36) NOT NULL, \`company_id\` char(36) NOT NULL, \`idem_key\` varchar(255) NOT NULL, \`request_hash\` char(64) NOT NULL, \`response_status\` int NULL, \`response_body\` json NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`uq_fiscal_idempotency\` (\`company_id\`, \`idem_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await q.query(`CREATE TABLE \`fiscal_api_keys\` (\`id\` varchar(36) NOT NULL, \`company_id\` char(36) NOT NULL, \`name\` varchar(100) NOT NULL, \`key_prefix\` varchar(12) NOT NULL, \`key_hash\` char(64) NOT NULL, \`scopes\` json NOT NULL, \`revoked_at\` datetime NULL, \`last_used_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_b81c257f2d56f789f8f121e8ac\` (\`key_hash\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE \`fiscal_api_keys\``);
    await q.query(`DROP TABLE \`fiscal_profiles\``);
    await q.query(`DROP TABLE \`fiscal_idempotency_keys\``);
    await q.query(`DROP TABLE \`fiscal_third_parties\``);
  }
}
