import { Injectable, Logger } from '@nestjs/common';

/** Wrong passwords tolerated from one address before it is locked out. */
export const MAX_ATTEMPTS = 5;

/** How long a locked address stays locked. */
export const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Failures older than this stop counting, so an honest typo today does not
 * combine with one from last week to lock the author out.
 */
export const WINDOW_MS = 15 * 60 * 1000;

interface Attempts {
  count: number;
  /** When the current run of failures began. */
  first: number;
  /** Epoch ms until which the address is refused, or 0. */
  lockedUntil: number;
}

/**
 * Rate limits sign-in attempts per client address.
 *
 * The password compare is already timing-safe, but that only stops the value
 * leaking through the clock — it does nothing about someone simply trying
 * again. With a single shared password and no user table, an unlimited POST
 * endpoint is the weakest thing on the site.
 *
 * State is held in memory. That suits a single instance and means a restart
 * clears every lock, which is an acceptable trade for having no dependency:
 * an attacker cannot restart the process, and the author who can is not the
 * one being defended against.
 */
@Injectable()
export class LoginThrottleService {
  private readonly logger = new Logger(LoginThrottleService.name);
  private readonly attempts = new Map<string, Attempts>();

  /** Milliseconds remaining on a lock, or 0 when the address may try. */
  retryAfter(key: string, now = Date.now()): number {
    const record = this.attempts.get(key);
    if (!record) return 0;

    if (record.lockedUntil > now) return record.lockedUntil - now;

    // The lock has expired, or the window has passed with no further
    // failures. Either way this address starts again with a clean slate.
    if (record.lockedUntil > 0 || now - record.first > WINDOW_MS) {
      this.attempts.delete(key);
    }

    return 0;
  }

  blocked(key: string, now = Date.now()): boolean {
    return this.retryAfter(key, now) > 0;
  }

  /** Records a wrong password. Returns true if that failure caused a lock. */
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

  /** A correct password clears the history for that address. */
  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Drops records that can no longer matter. Without this the map grows by
   * one entry per address that ever guessed wrong, which is unbounded and
   * attacker-controlled.
   */
  private sweep(now: number): void {
    for (const [key, record] of this.attempts) {
      const expired = record.lockedUntil > 0 && record.lockedUntil <= now;
      const stale = record.lockedUntil === 0 && now - record.first > WINDOW_MS;
      if (expired || stale) this.attempts.delete(key);
    }
  }
}
