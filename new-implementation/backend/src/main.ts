import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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
  const problems: string[] = [];
  for (const key of required) {
    const value = process.env[key];
    if (!value || value.startsWith('CHANGE_ME')) {
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

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

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