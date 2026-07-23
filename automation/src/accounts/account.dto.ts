import { Account } from './account.model';

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

export interface IssueResetInput {
  note?: string;
}

export interface NextTarget {
  next?: string;
}

export type AccountView = Pick<Account, 'id' | 'name' | 'email'>;

export function describeAccount(account: Account): AccountView {
  return { id: account.id, name: account.name, email: account.email };
}

export interface IssuedCodeView {
  code: string;
  next: string;
  context: 'register' | 'recover' | 'rotate';
}

export interface IssuedResetView {
  code: string;
  url: string;
}
