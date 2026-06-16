import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

/**
 * Fail fast in production if required secrets/config are missing or still set
 * to their placeholder values. Keeps the dev fallbacks in code unreachable in
 * prod (this throws before they can ever be used).
 */
function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DB_PASSWORD',
    'CORS_ORIGINS',
  ];
  // Reject anything that is unset, a CHANGE_ME placeholder, or one of the
  // in-code dev fallbacks (auth.constants.ts) — otherwise a value copied from
  // the committed dev config would silently pass in production.
  const placeholders = [
    'dev-only-secret-change-in-production',
    'dev-only-refresh-secret-change-in-production',
    'your-secret-key-change-in-production',
  ];
  const problems: string[] = [];
  for (const key of required) {
    const value = process.env[key];
    if (
      !value ||
      value.startsWith('CHANGE_ME') ||
      placeholders.includes(value)
    ) {
      problems.push(key);
    }
  }
  if (problems.length) {
    throw new Error(
      `Missing/placeholder production env vars: ${problems.join(', ')}. ` +
        `Set real values before starting in production.`,
    );
  }
}

async function bootstrap() {
  validateProductionEnv();

  // bufferLogs so early-boot logs aren't lost before the pino logger is wired.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    // Never use '*' with credentials (browsers reject it). In dev with no
    // CORS_ORIGINS set, reflect the request origin (`true`).
    origin: corsOrigins?.length
      ? corsOrigins
      : process.env.NODE_ENV === 'production'
        ? false
        : true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('POS API')
    .setDescription('Point of Sale REST API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, () => {
    logger.log(`Server running on port ${port}`);
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  });
}
bootstrap();