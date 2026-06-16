import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * Single source of truth for TypeORM connection options.
 *
 * Reused by:
 *  - the Nest app (`app.module.ts` → `TypeOrmModule.forRoot(dataSourceOptions)`)
 *  - the TypeORM CLI (the default export below) for migration generate/run.
 *
 * Production schema is managed by **migrations**, not `synchronize`. The
 * `database/schema.sql` file is historical/divergent and is NOT the source of
 * truth — the entities are. See SPEC-CUT-001 B-05/B-06.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pos_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
  // Never auto-sync in production — schema is owned by migrations there.
  synchronize: process.env.NODE_ENV !== 'production',
  // Opt-in (set DB_RUN_MIGRATIONS=true on the backend service) to run pending
  // migrations on app boot. Recommended for the single-instance Coolify deploy
  // so no separate release step is required.
  migrationsRun: process.env.DB_RUN_MIGRATIONS === 'true',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
