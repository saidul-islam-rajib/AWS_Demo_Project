import {
  LOCKOUT_MS,
  LoginThrottleService,
  MAX_ATTEMPTS,
  WINDOW_MS,
} from './login-throttle.service';

describe('LoginThrottleService', () => {
  let throttle: LoginThrottleService;
  const IP = '203.0.113.9';

  /** Time is injected rather than mocked, so these run instantly. */
  const now = 1_700_000_000_000;

  beforeEach(() => {
    throttle = new LoginThrottleService();
  });

  const failTimes = (n: number, at = now, key = IP) => {
    for (let i = 0; i < n; i++) throttle.recordFailure(key, at);
  };

  it('allows an address that has never tried', () => {
    expect(throttle.blocked(IP, now)).toBe(false);
  });

  it('tolerates fewer failures than the limit', () => {
    failTimes(MAX_ATTEMPTS - 1);

    expect(throttle.blocked(IP, now)).toBe(false);
  });

  it('locks on the attempt that reaches the limit', () => {
    failTimes(MAX_ATTEMPTS - 1);

    expect(throttle.recordFailure(IP, now)).toBe(true);
    expect(throttle.blocked(IP, now)).toBe(true);
  });

  it('stays locked for the full lockout', () => {
    failTimes(MAX_ATTEMPTS);

    expect(throttle.blocked(IP, now + LOCKOUT_MS - 1000)).toBe(true);
  });

  it('lets the address try again once the lockout passes', () => {
    failTimes(MAX_ATTEMPTS);

    expect(throttle.blocked(IP, now + LOCKOUT_MS + 1)).toBe(false);
  });

  it('reports how long is left, in a form the page can show', () => {
    failTimes(MAX_ATTEMPTS);

    const left = throttle.retryAfter(IP, now + 60_000);

    expect(left).toBe(LOCKOUT_MS - 60_000);
    expect(throttle.retryAfter(IP, now + LOCKOUT_MS + 1)).toBe(0);
  });

  it('locks one address without touching another', () => {
    // Otherwise one attacker could lock the author out of their own site.
    failTimes(MAX_ATTEMPTS);

    expect(throttle.blocked(IP, now)).toBe(true);
    expect(throttle.blocked('198.51.100.4', now)).toBe(false);
  });

  it('forgets failures that fall outside the window', () => {
    // A typo today should not combine with one from last week.
    failTimes(MAX_ATTEMPTS - 1);

    const later = now + WINDOW_MS + 1;
    expect(throttle.recordFailure(IP, later)).toBe(false);
    expect(throttle.blocked(IP, later)).toBe(false);
  });

  it('clears the count when the password is finally right', () => {
    failTimes(MAX_ATTEMPTS - 1);
    throttle.recordSuccess(IP);

    failTimes(MAX_ATTEMPTS - 1);
    expect(throttle.blocked(IP, now)).toBe(false);
  });

  it('does not grow without bound as addresses come and go', () => {
    // The map is keyed by attacker-controlled input, so stale entries have
    // to be collected or this is a memory leak with a hostile author.
    for (let i = 0; i < 500; i++) {
      throttle.recordFailure(`10.0.0.${i}`, now);
    }

    // One later failure sweeps everything that can no longer matter.
    throttle.recordFailure('10.1.0.1', now + WINDOW_MS + 1);

    const size = (throttle as unknown as { attempts: Map<string, unknown> })
      .attempts.size;

    expect(size).toBe(1);
  });
});
