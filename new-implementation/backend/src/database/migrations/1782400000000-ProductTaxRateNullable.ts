import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SPEC-BACK-009: `products.tax_rate` becomes nullable (null = inherit
 * `settings.taxRate`) and each order line records the rate it was sold at.
 *
 * Stored product rates are NOT touched: the product form and the legacy import
 * already wrote real rates there. The consequence is that sales now honour them,
 * so the log below tells whoever deploys how many products will stop selling at
 * their company's rate.
 */
export class ProductTaxRateNullable1782400000000 implements MigrationInterface {
  name = 'ProductTaxRateNullable1782400000000';

  public async up(q: QueryRunner): Promise<void> {
    const [{ differing, total }] = await q.query(
      `SELECT SUM(p.tax_rate <> COALESCE(s.taxRate, p.tax_rate)) AS differing, COUNT(*) AS total
         FROM \`products\` p LEFT JOIN \`settings\` s ON s.companyId = p.company_id`,
    );
    console.log(
      `[SPEC-BACK-009] ${differing ?? 0} of ${total} products hold a tax_rate different from their company's settings.taxRate and will now sell at it.`,
    );
    await q.query(`ALTER TABLE \`products\` CHANGE \`tax_rate\` \`tax_rate\` decimal(5,2) NULL`);
    await q.query(`ALTER TABLE \`order_items\` ADD \`tax_rate\` decimal(5,2) NULL`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE \`order_items\` DROP COLUMN \`tax_rate\``);
    // Not lossless by nature: "inherit" cannot be stored in a NOT NULL column, so it becomes the company rate.
    await q.query(
      `UPDATE \`products\` p LEFT JOIN \`settings\` s ON s.companyId = p.company_id
          SET p.tax_rate = COALESCE(s.taxRate, 0) WHERE p.tax_rate IS NULL`,
    );
    await q.query(`ALTER TABLE \`products\` CHANGE \`tax_rate\` \`tax_rate\` decimal(5,2) NOT NULL DEFAULT '0.00'`);
  }
}
