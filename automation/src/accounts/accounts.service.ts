import { Injectable, Logger } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  Account,
  AccountStore,
  CredentialsInput,
  RecoveryInput,
  RegisterInput,
  normaliseEmail,
  normaliseName,
  normaliseRecoveryCode,
} from './account.model';
import { newCode, seal, sealMatches } from './secret';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);
  private readonly dataDir =
    process.env.DATA_DIR ?? join(process.cwd(), 'data');
  private readonly file = join(this.dataDir, 'accounts.json');

  private accounts: Account[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.dataDir)) {
        mkdirSync(this.dataDir, { recursive: true });
      }

      if (!existsSync(this.file)) {
        this.accounts = [];
        return;
      }

      const stored = JSON.parse(
        readFileSync(this.file, 'utf8'),
      ) as Partial<AccountStore>;

      this.accounts = stored.accounts ?? [];
      this.logger.log(`Loaded ${this.accounts.length} account(s)`);
    } catch (err) {
      this.logger.error(`Could not load accounts: ${String(err)}`);
      this.accounts = [];
    }
  }

  private persist(): void {
    try {
      const tmp = `${this.file}.tmp`;
      const payload: AccountStore = { accounts: this.accounts };

      writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save accounts: ${String(err)}`);
    }
  }

  /**
   * Replaces the code on an account and returns the new one. The caller is
   * the only chance anybody has to see it, here and everywhere else.
   */
  private issueRecoveryCode(account: Account): string {
    const code = newCode();

    account.recovery = seal(code);
    account.recoveryIssuedAt = new Date().toISOString();
    this.persist();

    return code;
  }

  findByEmail(email?: string): Account | undefined {
    const wanted = normaliseEmail(email);

    return this.accounts.find((account) => account.email === wanted);
  }

  findById(id?: string): Account | undefined {
    return id ? this.accounts.find((account) => account.id === id) : undefined;
  }

  taken(email?: string): boolean {
    return Boolean(this.findByEmail(email));
  }

  register(input: RegisterInput): { account: Account; code: string } {
    const now = new Date().toISOString();
    const code = newCode();

    const account: Account = {
      id: randomUUID(),
      name: normaliseName(input.name),
      email: normaliseEmail(input.email),
      secret: seal(input.password ?? ''),
      recovery: seal(code),
      createdAt: now,
      recoveryIssuedAt: now,
    };

    this.accounts.push(account);
    this.persist();

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

  /**
   * Swaps the recovery code for somebody who still knows their password —
   * the case where a lost code costs nobody anything, so long as they can
   * replace it before they need it.
   */
  rotateRecovery(id: string, password?: string): string {
    const account = this.findById(id);
    if (!account) return '';

    return sealMatches(account.secret, password ?? '')
      ? this.issueRecoveryCode(account)
      : '';
  }

  /**
   * Sets a password without checking anything. Whoever calls this has already
   * established the person is who they say they are — today, by spending a
   * reset the owner issued to them.
   */
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

    return this.accounts
      .filter(
        (account) =>
          !wanted ||
          account.email.includes(wanted) ||
          account.name.toLowerCase().includes(wanted),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  rename(id: string, name: string): Account | undefined {
    const account = this.findById(id);
    if (!account) return undefined;

    account.name = normaliseName(name) || account.name;
    this.persist();

    return account;
  }

  get count(): number {
    return this.accounts.length;
  }
}
