export const MIN_PASSWORD_LENGTH = 8;

export const MAX_NAME_LENGTH = 80;

export const MAX_EMAIL_LENGTH = 120;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const RECOVERY_GROUPS = 4;

export const RECOVERY_GROUP_LENGTH = 5;

export const RECOVERY_CODE_LENGTH = RECOVERY_GROUPS * RECOVERY_GROUP_LENGTH;

/**
 * How long a reset link the owner hands out stays usable. Long enough to read
 * it down a phone line and type it in, short enough that a link left in a chat
 * window is worthless by the time anyone else finds it.
 */
export const RESET_LINK_MINUTES = 60;

export interface AccountBenefit {
  icon: string;
  title: string;
  detail: string;
}

export const ACCOUNT_BENEFITS: AccountBenefit[] = [
  {
    icon: '✓',
    title: 'Progress that follows you',
    detail:
      'Lessons you finish are kept on your account, not in one browser, so you can carry on from any device.',
  },
  {
    icon: '★',
    title: 'One certificate per course',
    detail:
      'A certificate is issued to you rather than to a browser, with a reference that never changes.',
  },
  {
    icon: '⚿',
    title: 'A way back in',
    detail:
      'You get a recovery code at sign-up, and can swap it for a fresh one whenever you are signed in. Nothing is emailed to you and your address is never shared.',
  },
];

export interface AccountStep {
  title: string;
  detail: string;
}

export const REGISTRATION_STEPS: AccountStep[] = [
  {
    title: 'Create your account',
    detail: 'Name, email and a password. That is the whole form.',
  },
  {
    title: 'Save your recovery code',
    detail:
      'Shown once, straight after. Lost it later? Ask for a new one from your account page.',
  },
  {
    title: 'Start learning',
    detail: 'You are signed in already, and stay signed in for 30 days.',
  },
];

export interface Account {
  id: string;
  name: string;
  email: string;
  secret: string;
  recovery: string;
  createdAt: string;
  recoveryIssuedAt?: string;
}

export interface AccountStore {
  accounts: Account[];
}

/**
 * A one-time password reset the owner issues to somebody who has lost both
 * their password and their recovery code. The code itself is sealed, so
 * issuing one is the only way to see it: the owner reads it out once and
 * cannot look it up again afterwards.
 */
export interface AccountReset {
  id: string;
  accountId: string;
  secret: string;
  note: string;
  issuedAt: string;
  expiresAt: string;
  usedAt: string;
  revokedAt: string;
}

export interface ResetStore {
  resets: AccountReset[];
}

export type ResetState = 'live' | 'used' | 'revoked' | 'expired';

export const RESET_STATE_LABELS: Record<ResetState, string> = {
  live: 'Waiting to be used',
  used: 'Used',
  revoked: 'Revoked',
  expired: 'Expired',
};

export function resetState(reset: AccountReset, now = Date.now()): ResetState {
  if (reset.usedAt) return 'used';
  if (reset.revokedAt) return 'revoked';

  return Date.parse(reset.expiresAt) > now ? 'live' : 'expired';
}

export interface RegisterInput {
  name?: string;
  email?: string;
  password?: string;
}

export interface CredentialsInput {
  email?: string;
  password?: string;
}

export interface RecoveryInput {
  email?: string;
  code?: string;
  password?: string;
}

export interface RotateInput {
  password?: string;
}

export type AccountView = Pick<Account, 'id' | 'name' | 'email'>;

export function normaliseName(value?: string): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
}

export function normaliseEmail(value?: string): string {
  return (value ?? '').trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);
}

export function validEmail(value?: string): boolean {
  return EMAIL_PATTERN.test(normaliseEmail(value));
}

export function validPassword(value?: string): boolean {
  return (value ?? '').length >= MIN_PASSWORD_LENGTH;
}

export function describeAccount(account: Account): AccountView {
  return { id: account.id, name: account.name, email: account.email };
}

export function formatDay(iso?: string): string {
  const at = new Date(iso ?? '');

  return Number.isNaN(at.getTime())
    ? ''
    : at.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
}

export function formatMoment(iso?: string): string {
  const at = new Date(iso ?? '');

  return Number.isNaN(at.getTime())
    ? ''
    : `${formatDay(iso)} at ${at.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
}

export function normaliseRecoveryCode(value?: string): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatRecoveryCode(raw: string): string {
  const groups: string[] = [];

  for (let at = 0; at < raw.length; at += RECOVERY_GROUP_LENGTH) {
    groups.push(raw.slice(at, at + RECOVERY_GROUP_LENGTH));
  }

  return groups.join('-');
}

export function recoveryProblem(input: RecoveryInput): string {
  if (!validEmail(input.email))
    return 'Enter the email address on the account.';

  if (normaliseRecoveryCode(input.code).length !== RECOVERY_CODE_LENGTH) {
    return 'Enter the recovery code you were given when you registered.';
  }

  if (!validPassword(input.password)) {
    return `Choose a new password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return '';
}

export function resetProblem(input: RecoveryInput): string {
  if (!validEmail(input.email))
    return 'Enter the email address on the account.';

  if (normaliseRecoveryCode(input.code).length !== RECOVERY_CODE_LENGTH) {
    return 'Enter the reset code from the link you were given.';
  }

  if (!validPassword(input.password)) {
    return `Choose a new password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return '';
}

export function rotationProblem(input: RotateInput): string {
  return input.password
    ? ''
    : 'Enter your password to be given a new recovery code.';
}

export function registrationProblem(input: RegisterInput): string {
  if (!normaliseName(input.name))
    return 'Enter the name you want on your certificates.';
  if (!validEmail(input.email))
    return 'Enter an email address that looks right.';
  if (!validPassword(input.password)) {
    return `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return '';
}
