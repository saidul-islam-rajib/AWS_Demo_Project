import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CertificatesService } from './certificates.service';

describe('CertificatesService', () => {
  let dir: string;
  let service: CertificatesService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'certs-test-'));
    process.env.DATA_DIR = dir;
    service = new CertificatesService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('issues one the first time', () => {
    const certificate = service.issue('user-1', 'course-1', 'Rajib');

    expect(certificate.accountId).toBe('user-1');
    expect(certificate.holder).toBe('Rajib');
    expect(certificate.reference).toHaveLength(7);
  });

  it('returns the same certificate on a second request', () => {
    const first = service.issue('user-1', 'course-1', 'Rajib');
    const second = service.issue('user-1', 'course-1', 'Rajib');

    expect(second.id).toBe(first.id);
    expect(second.reference).toBe(first.reference);
    expect(second.issuedAt).toBe(first.issuedAt);
  });

  it('does not let a changed name mint a second certificate', () => {
    const first = service.issue('user-1', 'course-1', 'Rajib');
    const second = service.issue('user-1', 'course-1', 'Someone Else');

    expect(second.id).toBe(first.id);
    expect(second.holder).toBe('Rajib');
    expect(service.forAccount('user-1')).toHaveLength(1);
  });

  it('keeps certificates for different courses apart', () => {
    service.issue('user-1', 'course-1', 'Rajib');
    service.issue('user-1', 'course-2', 'Rajib');

    expect(service.forAccount('user-1')).toHaveLength(2);
  });

  it('keeps certificates for different people apart', () => {
    const mine = service.issue('user-1', 'course-1', 'Rajib');
    const theirs = service.issue('user-2', 'course-1', 'Someone');

    expect(theirs.id).not.toBe(mine.id);
    expect(theirs.reference).not.toBe(mine.reference);
  });

  it('finds an existing certificate and reports a missing one', () => {
    service.issue('user-1', 'course-1', 'Rajib');

    expect(service.find('user-1', 'course-1')).toBeDefined();
    expect(service.find('user-1', 'course-2')).toBeUndefined();
    expect(service.find('user-2', 'course-1')).toBeUndefined();
  });

  it('lists only that account, newest first', () => {
    service.issue('user-1', 'course-1', 'Rajib');
    service.issue('user-2', 'course-1', 'Other');

    const mine = service.forAccount('user-1');

    expect(mine).toHaveLength(1);
    expect(mine[0].accountId).toBe('user-1');
  });

  it('survives a restart without reissuing', () => {
    const first = service.issue('user-1', 'course-1', 'Rajib');
    const reopened = new CertificatesService();

    expect(reopened.issue('user-1', 'course-1', 'Rajib').id).toBe(first.id);
    expect(reopened.forAccount('user-1')).toHaveLength(1);
  });
});
