export const MIN_PASSWORD_LENGTH = 8;

export const MAX_NAME_LENGTH = 80;

export const MAX_EMAIL_LENGTH = 120;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const RECOVERY_GROUPS = 4;

export const RECOVERY_GROUP_LENGTH = 5;

export interface Account {
  id: string;
  name: string;
  email: string;
  secret: string;
  recovery: string;
  createdAt: string;
}

export interface AccountStore {
  accounts: Account[];
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

  if (
    normaliseRecoveryCode(input.code).length !==
    RECOVERY_GROUPS * RECOVERY_GROUP_LENGTH
  ) {
    return 'Enter the recovery code you were given when you registered.';
  }

  if (!validPassword(input.password)) {
    return `Choose a new password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return '';
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
