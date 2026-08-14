import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOversellFlags1781700000000 implements MigrationInterface {
  name = 'AddOversellFlags1781700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE `products` ADD COLUMN `allow_sale_without_stock` TINYINT(1) NULL',
    );

    // El DDL inicial dejó DEFAULT 1 mientras el servicio escribía `false`. Se
    // unifica en 0 y se resetean las filas existentes: hasta ahora el
    // interruptor no lo leía nadie, así que su valor guardado no expresa
    // ninguna intención, y a partir de esta migración pasa a ser carga viva.
    await q.query(
      'ALTER TABLE `settings` MODIFY COLUMN `allowNegativeStock` TINYINT NOT NULL DEFAULT 0',
    );
    await q.query('UPDATE `settings` SET `allowNegativeStock` = 0');
  }

  public async down(q: QueryRunner): Promise<void> {
    // El `down` restaura el ESQUEMA, no los valores de fila: el UPDATE de `up`
    // es irreversible y no hay dónde leer los valores previos.
    await q.query(
      'ALTER TABLE `settings` MODIFY COLUMN `allowNegativeStock` TINYINT NOT NULL DEFAULT 1',
    );
    // Esto también es irreversible, y de forma más grave: el DROP se lleva
    // por delante la bandera de CADA producto, incluidos los ~272 productos
    // de excepción heredados del legado cuya preservación es la razón de ser
    // de esta columna. No hay snapshot ni backup implícito de esos valores —
    // si este `down` corre en producción, esa excepción por producto se
    // pierde para siempre y hay que reconstruirla a mano desde el legado.
    await q.query(
      'ALTER TABLE `products` DROP COLUMN `allow_sale_without_stock`',
    );
  }
}
