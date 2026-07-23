import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RecoveryPolicy } from '../shared/config/policies';
import { JsonCollection } from '../shared/persistence/json-collection';
import { AccountReset, resetState } from './account.model';
import { ResetState } from './reset-state';
import { normaliseRecoveryCode } from './recovery-code';
import { newCode, seal, sealMatches } from './secret';

@Injectable()
export class AccountResetService {
  private readonly logger = new Logger(AccountResetService.name);

  private readonly store = new JsonCollection<AccountReset>({
    file: 'account-resets.json',
    key: 'resets',
    label: 'account reset(s)',
  });

  issue(accountId: string, note: string): string {
    this.revoke(accountId);

    const code = newCode();
    const now = Date.now();

    this.store.add({
      id: randomUUID(),
      accountId,
      secret: seal(code),
      note: note.trim().slice(0, 300),
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + RecoveryPolicy.resetLinkMs).toISOString(),
      usedAt: '',
      revokedAt: '',
    });

    this.trim(accountId);
    this.logger.warn(`Issued an account reset for ${accountId}`);

    return code;
  }

  live(accountId: string, now = Date.now()): AccountReset | undefined {
    return this.store.find(
      (reset) =>
        reset.accountId === accountId &&
        resetState(reset, now) === ResetState.Live,
    );
  }

  history(accountId: string): AccountReset[] {
    return this.store
      .filter((reset) => reset.accountId === accountId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  liveAccountIds(now = Date.now()): Set<string> {
    return new Set(
      this.store
        .filter((reset) => resetState(reset, now) === ResetState.Live)
        .map((reset) => reset.accountId),
    );
  }

  revoke(accountId: string): boolean {
    const outstanding = this.live(accountId);
    if (!outstanding) return false;

    outstanding.revokedAt = new Date().toISOString();
    this.store.persist();

    return true;
  }

  consume(accountId: string, code?: string, now = Date.now()): boolean {
    const outstanding = this.live(accountId, now);
    if (!outstanding) return false;

    if (!sealMatches(outstanding.secret, normaliseRecoveryCode(code))) {
      return false;
    }

    outstanding.usedAt = new Date().toISOString();
    this.store.persist();

    return true;
  }

  private trim(accountId: string): void {
    const mine = this.history(accountId);
    if (mine.length <= RecoveryPolicy.resetHistoryDepth) return;

    const dropped = new Set(
      mine.slice(RecoveryPolicy.resetHistoryDepth).map((reset) => reset.id),
    );

    this.store.replaceAll(
      this.store.all().filter((reset) => !dropped.has(reset.id)),
    );
  }

  get count(): number {
    return this.store.size;
  }
}
