import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AccountsService } from './accounts.service';
import {
  MIN_PASSWORD_LENGTH,
  RECOVERY_GROUPS,
  RECOVERY_GROUP_LENGTH,
  formatRecoveryCode,
  normaliseEmail,
  normaliseName,
  registrationProblem,
  validEmail,
  validPassword,
} from './account.model';

describe('account.model', () => {
  it('trims and collapses a name', () => {
    expect(normaliseName('  Saidul   Islam  ')).toBe('Saidul Islam');
  });

  it('lowercases and trims an email', () => {
    expect(normaliseEmail('  A@B.COM ')).toBe('a@b.com');
  });

  it('accepts an address that looks right and rejects one that does not', () => {
    expect(validEmail('a@b.com')).toBe(true);
    expect(validEmail('a@b')).toBe(false);
    expect(validEmail('')).toBe(false);
  });

  it('requires a password of the stated length', () => {
    expect(validPassword('x'.repeat(MIN_PASSWORD_LENGTH))).toBe(true);
    expect(validPassword('x'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false);
  });

  it('reports the first problem with a registration', () => {
    expect(registrationProblem({})).toContain('name');
    expect(registrationProblem({ name: 'A' })).toContain('email');
    expect(registrationProblem({ name: 'A', email: 'a@b.com' })).toContain(
      'password',
    );
    expect(
      registrationProblem({
        name: 'A',
        email: 'a@b.com',
        password: 'x'.repeat(MIN_PASSWORD_LENGTH),
      }),
    ).toBe('');
  });
});

describe('AccountsService', () => {
  let dir: string;
  let service: AccountsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'accounts-test-'));
    process.env.DATA_DIR = dir;
    service = new AccountsService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  const register = () =>
    service.register({
      name: 'Saidul Islam Rajib',
      email: 'Rajib@Example.com',
      password: 'correct-horse',
    }).account;

  it('starts empty', () => {
    expect(service.count).toBe(0);
  });

  it('stores an account with a normalised email', () => {
    expect(register().email).toBe('rajib@example.com');
  });

  it('never stores the password itself', () => {
    const account = register();

    expect(account.secret).not.toContain('correct-horse');
    expect(account.secret).toContain(':');
  });

  it('salts, so two accounts with one password differ', () => {
    const a = register();
    const b = service.register({
      name: 'Other',
      email: 'other@example.com',
      password: 'correct-horse',
    }).account;

    expect(a.secret).not.toBe(b.secret);
  });

  it('authenticates the right password and refuses the wrong one', () => {
    register();

    expect(
      service.authenticate({
        email: 'rajib@example.com',
        password: 'correct-horse',
      }),
    ).toBeDefined();

    expect(
      service.authenticate({ email: 'rajib@example.com', password: 'wrong' }),
    ).toBeUndefined();
  });

  it('matches the email regardless of case', () => {
    register();

    expect(
      service.authenticate({
        email: 'RAJIB@EXAMPLE.COM',
        password: 'correct-horse',
      }),
    ).toBeDefined();
  });

  it('refuses an unknown address without throwing', () => {
    expect(
      service.authenticate({ email: 'nobody@example.com', password: 'x' }),
    ).toBeUndefined();
  });

  it('reports an address as taken', () => {
    register();

    expect(service.taken('rajib@example.com')).toBe(true);
    expect(service.taken('someone@example.com')).toBe(false);
  });

  it('survives a restart', () => {
    register();

    expect(new AccountsService().count).toBe(1);
  });
});

describe('recovery codes', () => {
  let dir: string;
  let service: AccountsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'recovery-test-'));
    process.env.DATA_DIR = dir;
    service = new AccountsService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  const create = () =>
    service.register({
      name: 'Rajib',
      email: 'rajib@example.com',
      password: 'correct-horse',
    });

  it('hands out a code of the declared shape', () => {
    const { code } = create();

    expect(code).toHaveLength(RECOVERY_GROUPS * RECOVERY_GROUP_LENGTH);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('never stores the code itself', () => {
    const { account, code } = create();

    expect(account.recovery).not.toContain(code);
    expect(account.recovery).toContain(':');
  });

  it('gives each account a different code', () => {
    const first = create().code;

    const second = service.register({
      name: 'Other',
      email: 'other@example.com',
      password: 'correct-horse',
    }).code;

    expect(second).not.toBe(first);
  });

  it('resets the password when the code matches', () => {
    const { code } = create();

    expect(
      service.recover({
        email: 'rajib@example.com',
        code,
        password: 'a-new-password',
      }),
    ).not.toBe('');

    expect(
      service.authenticate({
        email: 'rajib@example.com',
        password: 'a-new-password',
      }),
    ).toBeDefined();

    expect(
      service.authenticate({
        email: 'rajib@example.com',
        password: 'correct-horse',
      }),
    ).toBeUndefined();
  });

  it('accepts the code however it is punctuated or cased', () => {
    const { code } = create();

    expect(
      service.recover({
        email: 'rajib@example.com',
        code: formatRecoveryCode(code).toLowerCase(),
        password: 'a-new-password',
      }),
    ).not.toBe('');
  });

  it('refuses a wrong code and leaves the password alone', () => {
    create();

    expect(
      service.recover({
        email: 'rajib@example.com',
        code: 'W'.repeat(RECOVERY_GROUPS * RECOVERY_GROUP_LENGTH),
        password: 'a-new-password',
      }),
    ).toBe('');

    expect(
      service.authenticate({
        email: 'rajib@example.com',
        password: 'correct-horse',
      }),
    ).toBeDefined();
  });

  it('refuses an unknown address without throwing', () => {
    expect(
      service.recover({
        email: 'nobody@example.com',
        code: 'X'.repeat(RECOVERY_GROUPS * RECOVERY_GROUP_LENGTH),
        password: 'a-new-password',
      }),
    ).toBe('');
  });

  it('burns the code, so it cannot be reused', () => {
    const { code } = create();

    const replacement = service.recover({
      email: 'rajib@example.com',
      code,
      password: 'a-new-password',
    });

    expect(replacement).not.toBe(code);

    expect(
      service.recover({
        email: 'rajib@example.com',
        code,
        password: 'another-password',
      }),
    ).toBe('');

    expect(
      service.recover({
        email: 'rajib@example.com',
        code: replacement,
        password: 'another-password',
      }),
    ).not.toBe('');
  });
});
