import { AuthService } from './auth.service';

describe('AuthService', () => {
  const OLD = process.env.ADMIN_PASSWORD;

  afterEach(() => {
    if (OLD === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = OLD;
  });

  it('reports unconfigured when no password is set', () => {
    delete process.env.ADMIN_PASSWORD;
    const auth = new AuthService();

    expect(auth.configured).toBe(false);
    expect(auth.verifyPassword('anything')).toBe(false);
  });

  it('accepts the correct password and rejects others', () => {
    process.env.ADMIN_PASSWORD = 'correct-horse';
    const auth = new AuthService();

    expect(auth.verifyPassword('correct-horse')).toBe(true);
    expect(auth.verifyPassword('wrong')).toBe(false);
    expect(auth.verifyPassword('')).toBe(false);
  });

  it('issues a token that verifies', () => {
    process.env.ADMIN_PASSWORD = 'pw';
    const auth = new AuthService();

    expect(auth.verifyToken(auth.issueToken())).toBe(true);
  });

  it('rejects tampered, malformed and missing tokens', () => {
    process.env.ADMIN_PASSWORD = 'pw';
    const auth = new AuthService();
    const token = auth.issueToken();
    const [expiry] = token.split('.');

    expect(auth.verifyToken(`${expiry}.deadbeef`)).toBe(false);
    expect(auth.verifyToken('nonsense')).toBe(false);
    expect(auth.verifyToken(undefined)).toBe(false);
  });

  it('rejects an expired token', () => {
    process.env.ADMIN_PASSWORD = 'pw';
    const auth = new AuthService();
    const past = String(Date.now() - 1000);
    // Sign a stamp that has already passed, using the service's own signer.
    const signed = (auth as unknown as { sign: (v: string) => string }).sign(past);

    expect(auth.verifyToken(`${past}.${signed}`)).toBe(false);
  });
});
