import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Subject, requiresEnrolment } from './tutorial.model';

@Injectable()
export class EnrolmentService {
  private readonly secret =
    process.env.SESSION_SECRET ?? randomBytes(32).toString('hex');

  private readonly maxAgeMs = 1000 * 60 * 60 * 24 * 365;

  cookieName(subjectId: string): string {
    return `enrol_${subjectId.replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  get cookieMaxAge(): number {
    return this.maxAgeMs;
  }

  issue(subjectId: string): string {
    return createHmac('sha256', this.secret).update(subjectId).digest('hex');
  }

  private matches(candidate: string, expected: string): boolean {
    if (candidate.length !== expected.length) return false;

    return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
  }

  verifyToken(subjectId: string, token?: string): boolean {
    if (!token) return false;

    return this.matches(token, this.issue(subjectId));
  }

  verifyKey(subject: Subject, candidate?: string): boolean {
    if (!requiresEnrolment(subject)) return true;

    return this.matches((candidate ?? '').trim(), subject.enrolKey);
  }

  isEnrolled(subject: Subject, token?: string): boolean {
    if (!requiresEnrolment(subject)) return true;

    return this.verifyToken(subject.id, token);
  }
}
