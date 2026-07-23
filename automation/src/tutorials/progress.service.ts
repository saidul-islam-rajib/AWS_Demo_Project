import { Injectable, Logger } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

export interface Completion {
  accountId: string;
  lessonId: string;
  completedAt: string;
}

interface ProgressStore {
  completions: Completion[];
}

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);
  private readonly dataDir =
    process.env.DATA_DIR ?? join(process.cwd(), 'data');
  private readonly file = join(this.dataDir, 'progress.json');

  private completions: Completion[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.dataDir)) {
        mkdirSync(this.dataDir, { recursive: true });
      }

      if (!existsSync(this.file)) {
        this.completions = [];
        return;
      }

      const stored = JSON.parse(
        readFileSync(this.file, 'utf8'),
      ) as Partial<ProgressStore>;

      this.completions = stored.completions ?? [];
      this.logger.log(`Loaded ${this.completions.length} completion(s)`);
    } catch (err) {
      this.logger.error(`Could not load progress: ${String(err)}`);
      this.completions = [];
    }
  }

  private persist(): void {
    try {
      const tmp = `${this.file}.tmp`;
      const payload: ProgressStore = { completions: this.completions };

      writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save progress: ${String(err)}`);
    }
  }

  completed(accountId: string): string[] {
    return this.completions
      .filter((completion) => completion.accountId === accountId)
      .map((completion) => completion.lessonId);
  }

  isComplete(accountId: string, lessonId: string): boolean {
    return this.completions.some(
      (completion) =>
        completion.accountId === accountId && completion.lessonId === lessonId,
    );
  }

  countOf(accountId: string, lessonIds: string[]): number {
    const done = new Set(this.completed(accountId));

    return lessonIds.filter((lessonId) => done.has(lessonId)).length;
  }

  hasFinished(accountId: string, lessonIds: string[]): boolean {
    return (
      lessonIds.length > 0 &&
      this.countOf(accountId, lessonIds) === lessonIds.length
    );
  }

  mark(accountId: string, lessonId: string): void {
    if (this.isComplete(accountId, lessonId)) return;

    this.completions.push({
      accountId,
      lessonId,
      completedAt: new Date().toISOString(),
    });

    this.persist();
  }

  unmark(accountId: string, lessonId: string): void {
    const remaining = this.completions.filter(
      (completion) =>
        completion.accountId !== accountId || completion.lessonId !== lessonId,
    );

    if (remaining.length === this.completions.length) return;

    this.completions = remaining;
    this.persist();
  }

  set(accountId: string, lessonId: string, done: boolean): void {
    if (done) {
      this.mark(accountId, lessonId);
      return;
    }

    this.unmark(accountId, lessonId);
  }
}
