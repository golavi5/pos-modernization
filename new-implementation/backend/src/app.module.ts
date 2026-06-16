import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { dataSourceOptions } from './database/data-source';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { SalesModule } from './modules/sales/sales.module';
import { CustomersModule } from './modules/customers/customers.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { BootstrapModule } from './modules/bootstrap/bootstrap.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Structured (JSON) logging + per-request logging. Pretty in dev, JSON in
    // prod. Health probes are excluded so the ~30s Coolify heartbeat doesn't
    // bury real logs. Auth/cookie headers are redacted.
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        autoLogging: {
          ignore: (req) => (req.url ?? '').startsWith('/health'),
        },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    // Connection options (incl. synchronize gating + migrationsRun) live in
    // database/data-source.ts so the app and the TypeORM CLI stay in sync.
    TypeOrmModule.forRoot(dataSourceOptions),
    AuthModule,
    ProductsModule,
    SalesModule,
    CustomersModule,
    InventoryModule,
    ReportsModule,
    UsersModule,
    NotificationsModule,
    SettingsModule,
    CompaniesModule,
    BootstrapModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}