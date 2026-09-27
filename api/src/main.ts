import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { isDesktopOrigin, resolveCorsOrigins } from './shared/config/cors';
import { ORGANIZATION_HEADER } from './shared/constants/headers';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dev Station API')
    .setDescription(
      'Organizations, projects, integrations and agent sessions for the Dev Station desktop app',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const allowedOrigins = resolveCorsOrigins({
    nodeEnv: config.get('NODE_ENV'),
    corsUrls: config.get('CORS_URLS'),
    appUrl: config.get('APP_URL'),
    landingUrl: config.get('LANDING_URL'),
  });

  app.enableCors({
    // The Electron renderer loads from file:// / app:// (origin "null") in production builds.
    origin: (origin, callback) =>
      callback(
        null,
        !origin || isDesktopOrigin(origin) || allowedOrigins.includes(origin),
      ),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      ORGANIZATION_HEADER,
    ],
  });

  const port = config.get<number>('PORT') || 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Dev Station API listening on port ${port}`);
}
bootstrap();
