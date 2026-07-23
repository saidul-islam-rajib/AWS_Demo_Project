import { AccountSessionService } from './account-session.service';

describe('AccountSessionService', () => {
  let service: AccountSessionService;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret';
    service = new AccountSessionService();
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it('reads back the account it signed', () => {
    expect(service.read(service.issue('abc'))).toBe('abc');
  });

  it('rejects a tampered account id', () => {
    const token = service.issue('abc');
    const [, expiry, signature] = token.split('.');

    expect(service.read(`victim.${expiry}.${signature}`)).toBe('');
  });

  it('rejects a tampered expiry', () => {
    const token = service.issue('abc');
    const [id, , signature] = token.split('.');

    expect(service.read(`${id}.${Date.now() + 999999999}.${signature}`)).toBe(
      '',
    );
  });

  it('rejects a malformed or missing token', () => {
    expect(service.read('')).toBe('');
    expect(service.read('nonsense')).toBe('');
    expect(service.read('a.b')).toBe('');
    expect(service.read(undefined)).toBe('');
  });

  it('rejects a token signed with another secret', () => {
    const token = service.issue('abc');

    process.env.SESSION_SECRET = 'different-secret';
    expect(new AccountSessionService().read(token)).toBe('');
  });
});
