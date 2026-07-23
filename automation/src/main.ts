import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response, urlencoded } from 'express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');

  app.use(compression());

  app.use(cookieParser());

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/img') ||
      req.path.startsWith('/assets')
    ) {
      next();
      return;
    }

    res.setHeader(
      'Cache-Control',
      req.path.startsWith('/admin') || req.path === '/login'
        ? 'no-store'
        : 'no-cache, must-revalidate',
    );
    next();
  });
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  const uploadDir = join(
    process.env.DATA_DIR ?? join(process.cwd(), 'data'),
    'uploads',
  );
  mkdirSync(uploadDir, { recursive: true });
  app.use(
    '/uploads',
    express.static(uploadDir, { maxAge: '1y', immutable: true }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
