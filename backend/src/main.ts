import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { getAllowedOrigins } from './auth/auth.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);



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

  // All routes will start with /api
  app.setGlobalPrefix('api');

  // Start the backend on port 3000
  await app.listen(3000);
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start NEXORA backend:', error);
  process.exitCode = 1;
});