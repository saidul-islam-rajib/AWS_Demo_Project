import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  // Form posts from the editor arrive as urlencoded bodies.
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
