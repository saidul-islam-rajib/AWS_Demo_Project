export const MIN_PASSWORD_LENGTH = 8;

export const MAX_NAME_LENGTH = 80;

export const MAX_EMAIL_LENGTH = 120;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Account {
  id: string;
  name: string;
  email: string;
  secret: string;
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
