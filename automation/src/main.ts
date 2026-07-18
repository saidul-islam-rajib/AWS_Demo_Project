import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import express, { urlencoded } from 'express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  // Form posts from the editor arrive as urlencoded bodies.
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // Uploaded images live on the data volume so they survive redeploys.
  const uploadDir = join(process.env.DATA_DIR ?? join(process.cwd(), 'data'), 'uploads');
  mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
