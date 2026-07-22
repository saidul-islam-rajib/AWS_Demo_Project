import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import sharp from 'sharp';
import { uploadDir } from './uploads.service';

export const ALLOWED_WIDTHS = [200, 400, 800, 1600];

const CACHE_VERSION = 'v2';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
const CARD_VERSION = 'v1';

const RESIZABLE = new Set(['.png', '.jpg', '.jpeg', '.webp']);

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  private get cacheDir(): string {
    const base = process.env.DATA_DIR ?? join(process.cwd(), 'data');
    const dir = join(base, 'cache', 'images');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  canResize(name: string): boolean {
    return RESIZABLE.has(extname(name).toLowerCase());
  }

  private safeName(name: string): string | null {
    if (
      !name ||
      name.includes('/') ||
      name.includes('\\') ||
      name.includes('..')
    ) {
      return null;
    }
    return name;
  }

  originalPath(name: string): string | null {
    const safe = this.safeName(name);
    if (!safe) return null;

    const path = join(uploadDir(), safe);
    return existsSync(path) ? path : null;
  }

  async variant(name: string, width: number): Promise<string | null> {
    const source = this.originalPath(name);
    if (!source) return null;

    if (!ALLOWED_WIDTHS.includes(width) || !this.canResize(name)) return source;

    const target = join(
      this.cacheDir,
      `${basename(name, extname(name))}-${width}w-${CACHE_VERSION}.webp`,
    );

    if (
      existsSync(target) &&
      statSync(target).mtimeMs >= statSync(source).mtimeMs
    ) {
      return target;
    }

    try {
      const image = sharp(source);
      const meta = await image.metadata();

      if (meta.width && meta.width <= width) return source;

      await image
        // Auto-orient from EXIF and bake it in. Resizing drops the
        // orientation tag, so without this a photo the camera recorded as
        // "rotate me" renders in its raw sensor orientation.
        .rotate()
        .resize({ width, withoutEnlargement: true })
        // 82 is visually indistinguishable at these sizes and roughly halves
        // the bytes compared with 90.
        .webp({ quality: 82 })
        .toFile(target);

      return target;
    } catch (err) {
      this.logger.error(`Could not resize ${name}: ${String(err)}`);
      return source;
    }
  }

  async socialCard(name: string): Promise<string | null> {
    const source = this.originalPath(name);
    if (!source) return null;

    if (!this.canResize(name)) return source;

    const target = join(
      this.cacheDir,
      `${basename(name, extname(name))}-og-${CARD_VERSION}.jpg`,
    );

    if (
      existsSync(target) &&
      statSync(target).mtimeMs >= statSync(source).mtimeMs
    ) {
      return target;
    }

    try {
      const backdrop = await sharp(source)
        .rotate()
        .resize({ width: CARD_WIDTH, height: CARD_HEIGHT, fit: 'cover' })
        .blur(26)
        // Darkened so the photo on top stays the thing you look at.
        .modulate({ brightness: 0.55 })
        // JPEG has no alpha, and a transparent PNG would otherwise composite
        // onto undefined colour.
        .flatten({ background: '#12151b' })
        .toBuffer();

      const photo = await sharp(source)
        .rotate()
        .resize({ width: CARD_WIDTH, height: CARD_HEIGHT, fit: 'inside' })
        .toBuffer();

      await sharp(backdrop)
        .composite([{ input: photo, gravity: 'centre' }])
        .jpeg({ quality: 88, progressive: true })
        .toFile(target);

      return target;
    } catch (err) {
      this.logger.error(`Could not build a card for ${name}: ${String(err)}`);
      return source;
    }
  }
}
