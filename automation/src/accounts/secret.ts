import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { RecoveryPolicy } from '../shared/config/policies';
import { RECOVERY_ALPHABET } from './account.constants';

const KEY_LENGTH = 64;

const SALT_BYTES = 16;

function digest(value: string, salt: string): string {
  return scryptSync(value, salt, KEY_LENGTH).toString('hex');
}

export function seal(value: string): string {
  const salt = randomBytes(SALT_BYTES).toString('hex');

  return `${salt}:${digest(value, salt)}`;
}

export function sealMatches(sealed: string, value: string): boolean {
  const [salt, expected] = sealed.split(':');
  if (!salt || !expected) return false;

  const candidate = digest(value, salt);
  if (candidate.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

export function newCode(): string {
  let code = '';

  for (const byte of randomBytes(RecoveryPolicy.codeLength)) {
    code += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
  }

  return code;
}
