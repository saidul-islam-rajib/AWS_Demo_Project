import { EnrolmentService } from './enrolment.service';
import { Subject } from './tutorial.model';

function subject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: 's1',
    slug: 'networking',
    title: 'Networking',
    summary: '',
    icon: '',
    order: 1,
    status: 'published',
    enrolment: 'open',
    enrolKey: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('EnrolmentService', () => {
  let service: EnrolmentService;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret';
    service = new EnrolmentService();
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it('treats an open course as always enrolled', () => {
    expect(service.isEnrolled(subject())).toBe(true);
  });

  it('treats a key course with no key set as open', () => {
    expect(
      service.isEnrolled(subject({ enrolment: 'key', enrolKey: '' })),
    ).toBe(true);
  });

  it('locks a key course until a token is presented', () => {
    const locked = subject({ enrolment: 'key', enrolKey: 'autumn' });

    expect(service.isEnrolled(locked)).toBe(false);
    expect(service.isEnrolled(locked, service.issue(locked.id))).toBe(true);
  });

  it('rejects a token minted for a different course', () => {
    const locked = subject({ enrolment: 'key', enrolKey: 'autumn' });

    expect(service.isEnrolled(locked, service.issue('other-subject'))).toBe(
      false,
    );
  });

  it('rejects a token of the wrong length without throwing', () => {
    const locked = subject({ enrolment: 'key', enrolKey: 'autumn' });

    expect(service.isEnrolled(locked, 'short')).toBe(false);
    expect(service.isEnrolled(locked, '')).toBe(false);
  });

  it('accepts the right key and refuses a wrong one', () => {
    const locked = subject({ enrolment: 'key', enrolKey: 'autumn' });

    expect(service.verifyKey(locked, 'autumn')).toBe(true);
    expect(service.verifyKey(locked, ' autumn ')).toBe(true);
    expect(service.verifyKey(locked, 'winter')).toBe(false);
    expect(service.verifyKey(locked, undefined)).toBe(false);
  });

  it('accepts any key for an open course', () => {
    expect(service.verifyKey(subject(), 'anything')).toBe(true);
  });

  it('names the cookie per subject, stripped of punctuation', () => {
    expect(service.cookieName('abc-123')).toBe('enrol_abc123');
  });
});
