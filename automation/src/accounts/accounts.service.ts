import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JsonCollection } from '../shared/persistence/json-collection';
import { Account } from './account.model';
import { CredentialsInput, RecoveryInput, RegisterInput } from './account.dto';
import { normaliseEmail, normaliseName } from './account.rules';
import { normaliseRecoveryCode } from './recovery-code';
import { newCode, seal, sealMatches } from './secret';

@Injectable()
export class AccountsService {
  private readonly store = new JsonCollection<Account>({
    file: 'accounts.json',
    key: 'accounts',
    label: 'account(s)',
  });

  private issueRecoveryCode(account: Account): string {
    const code = newCode();

    account.recovery = seal(code);
    account.recoveryIssuedAt = new Date().toISOString();
    this.store.persist();

    return code;
  }

  findByEmail(email?: string): Account | undefined {
    const wanted = normaliseEmail(email);

    return this.store.find((account) => account.email === wanted);
  }

  findById(id?: string): Account | undefined {
    return id ? this.store.find((account) => account.id === id) : undefined;
  }

  taken(email?: string): boolean {
    return Boolean(this.findByEmail(email));
  }

  register(input: RegisterInput): { account: Account; code: string } {
    const now = new Date().toISOString();
    const code = newCode();

    const account = this.store.add({
      id: randomUUID(),
      name: normaliseName(input.name),
      email: normaliseEmail(input.email),
      secret: seal(input.password ?? ''),
      recovery: seal(code),
      createdAt: now,
      recoveryIssuedAt: now,
    });

    return { account, code };
  }

  recover(input: RecoveryInput): string {
    const account = this.findByEmail(input.email);
    if (!account) return '';

    if (!sealMatches(account.recovery, normaliseRecoveryCode(input.code))) {
      return '';
    }

    account.secret = seal(input.password ?? '');

    return this.issueRecoveryCode(account);
  }

  rotateRecovery(id: string, password?: string): string {
    const account = this.findById(id);
    if (!account) return '';

    return sealMatches(account.secret, password ?? '')
      ? this.issueRecoveryCode(account)
      : '';
  }

  resetPassword(id: string, password: string): string {
    const account = this.findById(id);
    if (!account) return '';

    account.secret = seal(password);

    return this.issueRecoveryCode(account);
  }

  authenticate(input: CredentialsInput): Account | undefined {
    const account = this.findByEmail(input.email);
    if (!account) return undefined;

    return sealMatches(account.secret, input.password ?? '')
      ? account
      : undefined;
  }

  list(query = ''): Account[] {
    const wanted = query.trim().toLowerCase();

    return this.store
      .filter(
        (account) =>
          !wanted ||
          account.email.includes(wanted) ||
          account.name.toLowerCase().includes(wanted),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get count(): number {
    return this.store.size;
  }
}
