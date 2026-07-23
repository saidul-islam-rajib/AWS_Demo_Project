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
import { certificateReference } from './tutorial.model';

export interface Certificate {
  id: string;
  accountId: string;
  subjectId: string;
  holder: string;
  reference: string;
  issuedAt: string;
}

interface CertificateStore {
  certificates: Certificate[];
}

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);
  private readonly dataDir =
    process.env.DATA_DIR ?? join(process.cwd(), 'data');
  private readonly file = join(this.dataDir, 'certificates.json');

  private certificates: Certificate[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.dataDir)) {
        mkdirSync(this.dataDir, { recursive: true });
      }

      if (!existsSync(this.file)) {
        this.certificates = [];
        return;
      }

      const stored = JSON.parse(
        readFileSync(this.file, 'utf8'),
      ) as Partial<CertificateStore>;

      this.certificates = stored.certificates ?? [];
      this.logger.log(`Loaded ${this.certificates.length} certificate(s)`);
    } catch (err) {
      this.logger.error(`Could not load certificates: ${String(err)}`);
      this.certificates = [];
    }
  }

  private persist(): void {
    try {
      const tmp = `${this.file}.tmp`;
      const payload: CertificateStore = { certificates: this.certificates };

      writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save certificates: ${String(err)}`);
    }
  }

  find(accountId: string, subjectId: string): Certificate | undefined {
    return this.certificates.find(
      (certificate) =>
        certificate.accountId === accountId &&
        certificate.subjectId === subjectId,
    );
  }

  forAccount(accountId: string): Certificate[] {
    return this.certificates
      .filter((certificate) => certificate.accountId === accountId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  issue(accountId: string, subjectId: string, holder: string): Certificate {
    const existing = this.find(accountId, subjectId);
    if (existing) return existing;

    const certificate: Certificate = {
      id: randomUUID(),
      accountId,
      subjectId,
      holder,
      reference: certificateReference(subjectId, accountId),
      issuedAt: new Date().toISOString(),
    };

    this.certificates.push(certificate);
    this.persist();

    return certificate;
  }
}
