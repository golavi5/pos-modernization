import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractMigrationSql, DEFAULT_MIGRATIONS_DIR } from './provision.js';

describe('extractMigrationSql', () => {
  it('pulls statements from up() and unescapes identifier backticks', () => {
    const file = `
      export class X {
        public async up(q: QueryRunner) {
          await queryRunner.query(\`CREATE TABLE \\\`t\\\` (\\\`id\\\` int)\`);
          await queryRunner.query(\`ALTER TABLE \\\`t\\\` ADD x int\`);
        }
        public async down(q: QueryRunner) {
          await queryRunner.query(\`DROP TABLE \\\`t\\\`\`);
        }
      }`;
    const stmts = extractMigrationSql(file);
    expect(stmts).toEqual([
      'CREATE TABLE `t` (`id` int)',
      'ALTER TABLE `t` ADD x int',
    ]);
  });

  it('returns [] when there is no up()', () => {
    expect(extractMigrationSql('export class X {}')).toEqual([]);
  });

  it('parses the REAL InitialSchema migration: creates customers, excludes down() DROPs', async () => {
    const file = await readFile(
      join(DEFAULT_MIGRATIONS_DIR, '1781578985277-InitialSchema.ts'),
      'utf8',
    );
    const stmts = extractMigrationSql(file);
    expect(stmts.length).toBeGreaterThan(10);
    expect(stmts.some((s) => s.startsWith('CREATE TABLE `customers`'))).toBe(true);
    // down()'s DROP TABLE statements must not leak into up() provisioning.
    expect(stmts.some((s) => /^DROP TABLE/.test(s))).toBe(false);
  });
});
