import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { RECOVERY_ALPHABET, RECOVERY_CODE_LENGTH } from './account.model';

const KEY_LENGTH = 64;

const SALT_BYTES = 16;

function digest(value: string, salt: string): string {
  return scryptSync(value, salt, KEY_LENGTH).toString('hex');
}

/**
 * Passwords, recovery codes and admin reset codes are all stored the same
 * way: a salted scrypt digest, written as `salt:digest`. Nothing here can be
 * read back, which is why nobody — the owner included — can hand a customer
 * the code they lost. A replacement is the only thing anyone can give them.
 */
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

/**
 * The alphabet is 32 characters and 256 divides by it exactly, so taking a
 * random byte modulo its length favours no character over another.
 */
export function newCode(): string {
  let code = '';

  for (const byte of randomBytes(RECOVERY_CODE_LENGTH)) {
    code += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
  }

  return code;
}
