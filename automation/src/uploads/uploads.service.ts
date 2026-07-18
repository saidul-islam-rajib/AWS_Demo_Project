import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';

/** Only formats a browser will render inline. */
const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Resolved on every call rather than captured at import time — the module may
 * be loaded before DATA_DIR is set, which silently sent uploads to the wrong
 * directory when it was a static field.
 */
export function uploadDir(): string {
  const dir = join(process.env.DATA_DIR ?? join(process.cwd(), 'data'), 'uploads');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  get dir(): string {
    return uploadDir();
  }

  constructor() {
    this.logger.log(`Uploads directory: ${this.dir}`);
  }

  isAllowed(originalName: string): boolean {
    return ALLOWED.has(extname(originalName).toLowerCase());
  }

  /**
   * Random filename derived only from the extension. The original name never
   * reaches the filesystem, so it cannot be used for path traversal.
   */
  generateName(originalName: string): string {
    const ext = extname(originalName).toLowerCase();
    return `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
  }

  list(): { name: string; url: string; size: number; uploadedAt: Date }[] {
    if (!existsSync(this.dir)) return [];

    return readdirSync(this.dir)
      .filter((name) => ALLOWED.has(extname(name).toLowerCase()))
      .map((name) => {
        const stat = statSync(join(this.dir, name));
        return {
          name,
          url: `/uploads/${name}`,
          size: stat.size,
          uploadedAt: stat.mtime,
        };
      })
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  remove(name: string): boolean {
    // Reject anything that is not a plain filename.
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
      return false;
    }

    const path = join(this.dir, name);
    if (!existsSync(path)) return false;

    unlinkSync(path);
    return true;
  }
}
