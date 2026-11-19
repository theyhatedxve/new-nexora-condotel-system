import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';
import { getAllowedOrigins } from './auth/auth.config.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  await app.listen(3000);
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start NEXORA backend:', error);
  process.exitCode = 1;
});