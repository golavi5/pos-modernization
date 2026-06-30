import { provisionTarget } from '../core/provision.js';
export async function runReset(): Promise<void> {
  await provisionTarget({
    host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3308),
    user: process.env.DB_USER ?? 'root', password: process.env.DB_PASSWORD ?? '',
    database: process.env.TARGET_DB_NAME ?? 'pos_db_migration',
  });
}
