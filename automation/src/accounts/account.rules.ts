import { RecoveryPolicy } from '../shared/config/policies';
import {
  EMAIL_PATTERN,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
} from './account.constants';
import { hasCodeLength } from './recovery-code';
import {
  CredentialsInput,
  RecoveryInput,
  RegisterInput,
  RotateInput,
} from './account.dto';

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
  return (value ?? '').length >= RecoveryPolicy.minPasswordLength;
}

function passwordRequirement(): string {
  return `at least ${RecoveryPolicy.minPasswordLength} characters`;
}

export function registrationProblem(input: RegisterInput): string {
  if (!normaliseName(input.name))
    return 'Enter the name you want on your certificates.';
  if (!validEmail(input.email))
    return 'Enter an email address that looks right.';
  if (!validPassword(input.password))
    return `Choose a password of ${passwordRequirement()}.`;

  return '';
}

export function credentialsProblem(input: CredentialsInput): string {
  if (!validEmail(input.email)) return 'Enter the email on your account.';
  if (!input.password) return 'Enter your password.';

  return '';
}

export function recoveryProblem(input: RecoveryInput): string {
  if (!validEmail(input.email))
    return 'Enter the email address on the account.';
  if (!hasCodeLength(input.code))
    return 'Enter the recovery code you were given when you registered.';
  if (!validPassword(input.password))
    return `Choose a new password of ${passwordRequirement()}.`;

  return '';
}

export function resetProblem(input: RecoveryInput): string {
  if (!validEmail(input.email))
    return 'Enter the email address on the account.';
  if (!hasCodeLength(input.code))
    return 'Enter the reset code from the link you were given.';
  if (!validPassword(input.password))
    return `Choose a new password of ${passwordRequirement()}.`;

  return '';
}

export function rotationProblem(input: RotateInput): string {
  return input.password
    ? ''
    : 'Enter your password to be given a new recovery code.';
}
