import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response, urlencoded } from 'express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Pages carry their CSS and behaviour inline, so the HTML is large and
  // highly compressible. Must come before any handler that writes a response.
  app.use(compression());

  app.use(cookieParser());

  // HTML must revalidate so an edit is never served stale; the ETag Express
  // already sets turns that revalidation into a 304 with no body. Admin
  // pages additionally must not be stored by any shared cache.
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Images set their own long-lived headers; stamping them here would
    // override a year of caching with a revalidation on every request.
    if (req.path.startsWith('/uploads') || req.path.startsWith('/img')) {
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
  // Form posts from the editor arrive as urlencoded bodies.
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // Uploaded images live on the data volume so they survive redeploys.
  const uploadDir = join(
    process.env.DATA_DIR ?? join(process.cwd(), 'data'),
    'uploads',
  );
  mkdirSync(uploadDir, { recursive: true });
  // Upload filenames carry a timestamp and random suffix, so a given URL
  // always refers to the same bytes and can be cached for a year.
  app.use(
    '/uploads',
    express.static(uploadDir, { maxAge: '1y', immutable: true }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}
// Surface a boot failure and exit non-zero, so the pipeline's Verify stage
// fails fast instead of polling a container that will never answer.
bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
