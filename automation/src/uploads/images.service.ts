import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import sharp from 'sharp';
import { uploadDir } from './uploads.service';

/** Widths the gallery and cards ask for. Anything else is rejected. */
export const ALLOWED_WIDTHS = [200, 400, 800, 1600];

/** Formats worth resizing. SVG is vector and GIF may be animated. */
const RESIZABLE = new Set(['.png', '.jpg', '.jpeg', '.webp']);

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  /**
   * Outside uploads/ so the cache is never listed as a user upload or served
   * by the static handler. Not a dot-directory either: express refuses to
   * send files from one, which is a silent 404.
   */
  private get cacheDir(): string {
    const base = process.env.DATA_DIR ?? join(process.cwd(), 'data');
    const dir = join(base, 'cache', 'images');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  canResize(name: string): boolean {
    return RESIZABLE.has(extname(name).toLowerCase());
  }

  /** Rejects anything that is not a plain filename. */
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

  /**
   * Returns a cached resize, generating it on first request.
   *
   * Done on demand rather than at upload time so images that predate this
   * benefit without a migration, and so adding a width later costs nothing.
   * Falls back to the original if anything goes wrong — a slow image beats a
   * broken one.
   */
  async variant(name: string, width: number): Promise<string | null> {
    const source = this.originalPath(name);
    if (!source) return null;

    if (!ALLOWED_WIDTHS.includes(width) || !this.canResize(name)) return source;

    const target = join(
      this.cacheDir,
      `${basename(name, extname(name))}-${width}w.webp`,
    );

    // Regenerate if the original has been replaced since the cache was written.
    if (
      existsSync(target) &&
      statSync(target).mtimeMs >= statSync(source).mtimeMs
    ) {
      return target;
    }

    try {
      const image = sharp(source);
      const meta = await image.metadata();

      // Never upscale: a 300px original asked for at 800 stays 300.
      if (meta.width && meta.width <= width) return source;

      await image
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
}
