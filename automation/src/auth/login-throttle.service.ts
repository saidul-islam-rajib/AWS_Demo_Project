import { Injectable, Logger } from '@nestjs/common';

export const MAX_ATTEMPTS = 5;

export const LOCKOUT_MS = 15 * 60 * 1000;

export const WINDOW_MS = 15 * 60 * 1000;

interface Attempts {
  count: number;
  first: number;
  lockedUntil: number;
}

@Injectable()
export class LoginThrottleService {
  private readonly logger = new Logger(LoginThrottleService.name);
  private readonly attempts = new Map<string, Attempts>();

  retryAfter(key: string, now = Date.now()): number {
    const record = this.attempts.get(key);
    if (!record) return 0;

    if (record.lockedUntil > now) return record.lockedUntil - now;

    if (record.lockedUntil > 0 || now - record.first > WINDOW_MS) {
      this.attempts.delete(key);
    }

    return 0;
  }

  blocked(key: string, now = Date.now()): boolean {
    return this.retryAfter(key, now) > 0;
  }

  recordFailure(key: string, now = Date.now()): boolean {
    this.sweep(now);

    const record = this.attempts.get(key);

    if (!record || now - record.first > WINDOW_MS) {
      this.attempts.set(key, { count: 1, first: now, lockedUntil: 0 });
      return false;
    }

    record.count += 1;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
      this.logger.warn(
        `Locked sign-in from ${key} after ${record.count} failed attempts.`,
      );
      return true;
    }

    return false;
  }

  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }

  private sweep(now: number): void {
    for (const [key, record] of this.attempts) {
      const expired = record.lockedUntil > 0 && record.lockedUntil <= now;
      const stale = record.lockedUntil === 0 && now - record.first > WINDOW_MS;
      if (expired || stale) this.attempts.delete(key);
    }
  }
}
