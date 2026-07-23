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
  AccountReset,
  RESET_LINK_MINUTES,
  ResetStore,
  normaliseRecoveryCode,
  resetState,
} from './account.model';
import { newCode, seal, sealMatches } from './secret';

/** How many issues to keep per account, so the audit trail stays readable. */
const HISTORY_LIMIT = 10;

@Injectable()
export class AccountResetService {
  private readonly logger = new Logger(AccountResetService.name);
  private readonly dataDir =
    process.env.DATA_DIR ?? join(process.cwd(), 'data');
  private readonly file = join(this.dataDir, 'account-resets.json');

  private resets: AccountReset[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.dataDir)) {
        mkdirSync(this.dataDir, { recursive: true });
      }

      if (!existsSync(this.file)) {
        this.resets = [];
        return;
      }

      const stored = JSON.parse(
        readFileSync(this.file, 'utf8'),
      ) as Partial<ResetStore>;

      this.resets = stored.resets ?? [];
      this.logger.log(`Loaded ${this.resets.length} account reset(s)`);
    } catch (err) {
      this.logger.error(`Could not load account resets: ${String(err)}`);
      this.resets = [];
    }
  }

  private persist(): void {
    try {
      const tmp = `${this.file}.tmp`;
      const payload: ResetStore = { resets: this.resets };

      writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save account resets: ${String(err)}`);
    }
  }

  /**
   * Issues a reset and returns the code, which is the only time it is ever
   * readable. Any earlier one is revoked first, so an account never has two
   * live codes and a second phone call cannot be answered with the first.
   */
  issue(accountId: string, note: string): string {
    this.revoke(accountId);

    const code = newCode();
    const now = Date.now();

    this.resets.push({
      id: randomUUID(),
      accountId,
      secret: seal(code),
      note: note.trim().slice(0, 300),
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + RESET_LINK_MINUTES * 60_000).toISOString(),
      usedAt: '',
      revokedAt: '',
    });

    this.trim(accountId);
    this.persist();
    this.logger.warn(`Issued an account reset for ${accountId}`);

    return code;
  }

  live(accountId: string, now = Date.now()): AccountReset | undefined {
    return this.resets.find(
      (reset) =>
        reset.accountId === accountId && resetState(reset, now) === 'live',
    );
  }

  history(accountId: string): AccountReset[] {
    return this.resets
      .filter((reset) => reset.accountId === accountId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  /** Ids of the accounts with a code still waiting to be spent. */
  liveAccountIds(now = Date.now()): Set<string> {
    return new Set(
      this.resets
        .filter((reset) => resetState(reset, now) === 'live')
        .map((reset) => reset.accountId),
    );
  }

  revoke(accountId: string): boolean {
    const outstanding = this.live(accountId);
    if (!outstanding) return false;

    outstanding.revokedAt = new Date().toISOString();
    this.persist();

    return true;
  }

  /**
   * Spends the live code for an account. There is at most one, so a wrong
   * guess costs a single comparison and cannot be used to probe for others.
   */
  consume(accountId: string, code?: string, now = Date.now()): boolean {
    const outstanding = this.live(accountId, now);
    if (!outstanding) return false;

    if (!sealMatches(outstanding.secret, normaliseRecoveryCode(code))) {
      return false;
    }

    outstanding.usedAt = new Date().toISOString();
    this.persist();

    return true;
  }

  private trim(accountId: string): void {
    const mine = this.history(accountId);
    if (mine.length <= HISTORY_LIMIT) return;

    const dropped = new Set(mine.slice(HISTORY_LIMIT).map((reset) => reset.id));

    this.resets = this.resets.filter((reset) => !dropped.has(reset.id));
  }

  get count(): number {
    return this.resets.length;
  }
}
