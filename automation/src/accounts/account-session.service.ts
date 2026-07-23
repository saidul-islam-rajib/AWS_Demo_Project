import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { SecurityPolicy } from '../shared/config/policies';

@Injectable()
export class AccountSessionService {
  static readonly COOKIE = 'account_session';

  private readonly secret =
    process.env.SESSION_SECRET ?? randomBytes(32).toString('hex');

  get cookieMaxAge(): number {
    return SecurityPolicy.sessionMs;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }

  issue(accountId: string): string {
    const expiry = Date.now() + SecurityPolicy.sessionMs;
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
