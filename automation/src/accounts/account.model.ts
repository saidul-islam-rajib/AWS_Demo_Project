import { ResetState } from './reset-state';

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

export function resetState(reset: AccountReset, now = Date.now()): ResetState {
  if (reset.usedAt) return ResetState.Used;
  if (reset.revokedAt) return ResetState.Revoked;

  return Date.parse(reset.expiresAt) > now
    ? ResetState.Live
    : ResetState.Expired;
}

export * from './account.constants';
export * from './account.dto';
export * from './account.rules';
export * from './recovery-code';
export * from './reset-state';
export { ACCOUNT_BENEFITS, REGISTRATION_STEPS } from './account.content';
export type { AccountBenefit, AccountStep } from './account.content';
export { formatDay, formatMoment } from '../shared/format/dates';
