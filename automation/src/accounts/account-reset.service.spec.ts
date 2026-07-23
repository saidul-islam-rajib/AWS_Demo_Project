import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AccountResetService } from './account-reset.service';
import { formatRecoveryCode, resetState } from './account.model';
import { ResetState } from './reset-state';
import { RecoveryPolicy } from '../shared/config/policies';

const RECOVERY_CODE_LENGTH = RecoveryPolicy.codeLength;
const AFTER_EXPIRY = RecoveryPolicy.resetLinkMs + 1000;

describe('AccountResetService', () => {
  let dir: string;
  let service: AccountResetService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'resets-test-'));
    process.env.DATA_DIR = dir;
    service = new AccountResetService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  const issue = () => service.issue('account-1', 'Replied from the address');

  it('starts with nothing outstanding', () => {
    expect(service.live('account-1')).toBeUndefined();
    expect(service.history('account-1')).toEqual([]);
  });

  it('hands out a code of the same shape as a recovery code', () => {
    const code = issue();

    expect(code).toHaveLength(RECOVERY_CODE_LENGTH);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('never stores the code itself', () => {
    const code = issue();
    const [stored] = service.history('account-1');

    expect(stored.secret).not.toContain(code);
    expect(stored.secret).toContain(':');
  });

  it('keeps why it was issued, so there is a record', () => {
    issue();

    expect(service.history('account-1')[0].note).toBe(
      'Replied from the address',
    );
  });

  it('spends the code once and refuses it afterwards', () => {
    const code = issue();

    expect(service.consume('account-1', code)).toBe(true);
    expect(service.consume('account-1', code)).toBe(false);
  });

  it('accepts the code however it is punctuated or cased', () => {
    const code = issue();

    expect(
      service.consume('account-1', formatRecoveryCode(code).toLowerCase()),
    ).toBe(true);
  });

  it('refuses a wrong code and leaves the reset usable', () => {
    const code = issue();

    expect(service.consume('account-1', 'W'.repeat(RECOVERY_CODE_LENGTH))).toBe(
      false,
    );
    expect(service.consume('account-1', code)).toBe(true);
  });

  it('will not open an account the code was not cut for', () => {
    const code = issue();

    expect(service.consume('account-2', code)).toBe(false);
    expect(service.consume('account-1', code)).toBe(true);
  });

  it('refuses a code that has expired', () => {
    const code = issue();

    expect(service.consume('account-1', code, Date.now() + AFTER_EXPIRY)).toBe(
      false,
    );
  });

  it('reports an expired code as expired rather than live', () => {
    issue();

    const [reset] = service.history('account-1');

    expect(resetState(reset)).toBe(ResetState.Live);
    expect(resetState(reset, Date.now() + AFTER_EXPIRY)).toBe(
      ResetState.Expired,
    );
  });

  it('cancels the previous code when another is issued', () => {
    const first = issue();
    const second = issue();

    expect(service.consume('account-1', first)).toBe(false);
    expect(service.consume('account-1', second)).toBe(true);
  });

  it('leaves only one code waiting at a time', () => {
    issue();
    issue();

    expect(service.history('account-1')).toHaveLength(2);
    expect(service.live('account-1')).toBeDefined();
    expect(
      service
        .history('account-1')
        .filter((r) => resetState(r) === ResetState.Live),
    ).toHaveLength(1);
  });

  it('revokes an outstanding code on request', () => {
    const code = issue();

    expect(service.revoke('account-1')).toBe(true);
    expect(service.consume('account-1', code)).toBe(false);
    expect(resetState(service.history('account-1')[0])).toBe(
      ResetState.Revoked,
    );
  });

  it('has nothing to revoke once a code is spent', () => {
    service.consume('account-1', issue());

    expect(service.revoke('account-1')).toBe(false);
  });

  it('records that a spent code was used', () => {
    service.consume('account-1', issue());

    expect(resetState(service.history('account-1')[0])).toBe(ResetState.Used);
  });

  it('lists the accounts with a code still waiting', () => {
    issue();
    service.issue('account-2', 'Known in person');
    service.consume('account-2', service.issue('account-2', 'Second try'));

    expect([...service.liveAccountIds()]).toEqual(['account-1']);
  });

  it('keeps the history newest first', () => {
    issue();
    service.issue('account-1', 'Second');

    const [newest, oldest] = service.history('account-1');

    expect(newest.note).toBe('Second');
    expect(oldest.note).toBe('Replied from the address');
  });

  it('caps the history rather than growing without end', () => {
    for (let i = 0; i < 14; i += 1) {
      service.issue('account-1', `Attempt ${i}`);
    }

    const kept = service.history('account-1');

    expect(kept).toHaveLength(10);
    expect(kept[0].note).toBe('Attempt 13');
  });

  it('survives a restart', () => {
    const code = issue();

    expect(new AccountResetService().consume('account-1', code)).toBe(true);
  });
});
