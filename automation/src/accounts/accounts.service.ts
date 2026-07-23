import { Injectable, Logger } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import {
  Account,
  AccountStore,
  CredentialsInput,
  RECOVERY_ALPHABET,
  RECOVERY_GROUPS,
  RECOVERY_GROUP_LENGTH,
  RecoveryInput,
  RegisterInput,
  normaliseEmail,
  normaliseName,
  normaliseRecoveryCode,
} from './account.model';

const KEY_LENGTH = 64;

const SALT_BYTES = 16;

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

  private hash(password: string, salt: string): string {
    return scryptSync(password, salt, KEY_LENGTH).toString('hex');
  }

  private newRecoveryCode(): string {
    const length = RECOVERY_GROUPS * RECOVERY_GROUP_LENGTH;
    const bytes = randomBytes(length);
    let code = '';

    for (const byte of bytes) {
      code += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
    }

    return code;
  }

  private secretFor(password: string): string {
    const salt = randomBytes(SALT_BYTES).toString('hex');

    return `${salt}:${this.hash(password, salt)}`;
  }

  private secretMatches(secret: string, password: string): boolean {
    const [salt, expected] = secret.split(':');
    if (!salt || !expected) return false;

    const candidate = this.hash(password, salt);
    if (candidate.length !== expected.length) return false;

    return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
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
    const code = this.newRecoveryCode();

    const account: Account = {
      id: randomUUID(),
      name: normaliseName(input.name),
      email: normaliseEmail(input.email),
      secret: this.secretFor(input.password ?? ''),
      recovery: this.secretFor(code),
      createdAt: new Date().toISOString(),
    };

    this.accounts.push(account);
    this.persist();

    return { account, code };
  }

  recover(input: RecoveryInput): string {
    const account = this.findByEmail(input.email);
    if (!account) return '';

    if (
      !this.secretMatches(account.recovery, normaliseRecoveryCode(input.code))
    ) {
      return '';
    }

    const replacement = this.newRecoveryCode();

    account.secret = this.secretFor(input.password ?? '');
    account.recovery = this.secretFor(replacement);
    this.persist();

    return replacement;
  }

  authenticate(input: CredentialsInput): Account | undefined {
    const account = this.findByEmail(input.email);
    if (!account) return undefined;

    return this.secretMatches(account.secret, input.password ?? '')
      ? account
      : undefined;
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
