import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const SESSION_DAYS = 30;

@Injectable()
export class AccountSessionService {
  static readonly COOKIE = 'account_session';

  private readonly secret =
    process.env.SESSION_SECRET ?? randomBytes(32).toString('hex');

  private readonly maxAgeMs = 1000 * 60 * 60 * 24 * SESSION_DAYS;

  get cookieMaxAge(): number {
    return this.maxAgeMs;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }

  issue(accountId: string): string {
    const expiry = Date.now() + this.maxAgeMs;
    const payload = `${accountId}.${expiry}`;

    return `${payload}.${this.sign(payload)}`;
  }

  read(token?: string): string {
    if (!token) return '';

    const parts = token.split('.');
    if (parts.length !== 3) return '';

    const [accountId, expiry, signature] = parts;
    const expected = this.sign(`${accountId}.${expiry}`);

    if (signature.length !== expected.length) return '';

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return '';
    }

    return Number(expiry) > Date.now() ? accountId : '';
  }
}
