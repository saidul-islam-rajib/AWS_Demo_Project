import { Injectable, Logger } from '@nestjs/common';
import { SecurityPolicy } from '../shared/config/policies';

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

    if (
      record.lockedUntil > 0 ||
      now - record.first > SecurityPolicy.windowMs
    ) {
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

    if (!record || now - record.first > SecurityPolicy.windowMs) {
      this.attempts.set(key, { count: 1, first: now, lockedUntil: 0 });
      return false;
    }

    record.count += 1;

    if (record.count >= SecurityPolicy.maxLoginAttempts) {
      record.lockedUntil = now + SecurityPolicy.lockoutMs;
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
      const stale =
        record.lockedUntil === 0 &&
        now - record.first > SecurityPolicy.windowMs;
      if (expired || stale) this.attempts.delete(key);
    }
  }
}
