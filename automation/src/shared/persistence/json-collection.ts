import { Logger } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

export interface JsonCollectionOptions {
  file: string;
  key: string;
  label?: string;
}

export function dataDir(): string {
  return process.env.DATA_DIR ?? join(process.cwd(), 'data');
}

export class JsonCollection<T> {
  private readonly logger: Logger;
  private items: T[] = [];

  constructor(private readonly options: JsonCollectionOptions) {
    this.logger = new Logger(`JsonCollection:${options.key}`);
    this.load();
  }

  private get path(): string {
    return join(dataDir(), this.options.file);
  }

  private load(): void {
    try {
      const dir = dataDir();
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      if (!existsSync(this.path)) {
        this.items = [];
        return;
      }

      const stored = JSON.parse(readFileSync(this.path, 'utf8')) as Record<
        string,
        T[]
      >;

      this.items = Array.isArray(stored[this.options.key])
        ? stored[this.options.key]
        : [];

      if (this.options.label) {
        this.logger.log(`Loaded ${this.items.length} ${this.options.label}`);
      }
    } catch (err) {
      this.logger.error(`Could not load ${this.options.file}: ${String(err)}`);
      this.items = [];
    }
  }

  persist(): void {
    try {
      const dir = dataDir();
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      const tmp = `${this.path}.tmp`;
      writeFileSync(
        tmp,
        JSON.stringify({ [this.options.key]: this.items }, null, 2),
        'utf8',
      );
      renameSync(tmp, this.path);
    } catch (err) {
      this.logger.error(`Could not save ${this.options.file}: ${String(err)}`);
    }
  }

  all(): T[] {
    return this.items;
  }

  replaceAll(next: T[]): void {
    this.items = next;
    this.persist();
  }

  add(item: T): T {
    this.items.push(item);
    this.persist();

    return item;
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  get size(): number {
    return this.items.length;
  }
}
