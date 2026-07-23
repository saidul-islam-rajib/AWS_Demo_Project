import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { TutorialsService } from './tutorials.service';
import { renderMarkdown } from '../posts/markdown';
import { notFoundPage } from '../views/public/posts.pages';
import {
  subjectPage,
  tutorialPage,
  tutorialsIndexPage,
} from '../views/public/tutorials.page';
import {
  certificateFormPage,
  certificateLockedPage,
  certificatePage,
} from '../views/public/certificate.page';
import { NO_PROGRESS_STATE, ProgressState } from '../views/shared/components';
import { getSettings } from '../settings/settings.store';
import {
  certificateContact,
  certificateHolder,
  formatDuration,
} from './tutorial.model';
import sharp from 'sharp';
import { certificateSvg } from './certificate.svg';
import { CertificatesService } from './certificates.service';
import { AccountsService } from '../accounts/accounts.service';
import { AccountSessionService } from '../accounts/account-session.service';
import { ACCOUNT_PATHS } from '../views/public/account.pages';
import type { Account } from '../accounts/account.model';
import { Subject, SubjectStats, requiresEnrolment } from './tutorial.model';
import { EnrolmentService } from './enrolment.service';
import { ProgressService } from './progress.service';

const PROGRESS_PATH = '/tutorials/progress';

@Controller('tutorials')
export class TutorialsController {
  constructor(
    private readonly tutorials: TutorialsService,
    private readonly enrolment: EnrolmentService,
    private readonly certificates: CertificatesService,
    private readonly progress: ProgressService,
    private readonly accounts: AccountsService,
    private readonly session: AccountSessionService,
  ) {}

  private currentAccount(req: Request): Account | undefined {
    const cookies = (req.cookies ?? {}) as Record<string, string>;

    return this.accounts.findById(
      this.session.read(cookies[AccountSessionService.COOKIE]),
    );
  }

  private signInFirst(res: Response, slug: string): void {
    const next = encodeURIComponent(`/tutorials/${slug}/certificate`);

    res.redirect(`${ACCOUNT_PATHS.signIn}?next=${next}`);
  }

  private progressState(req: Request): ProgressState {
    const account = this.currentAccount(req);

    if (!account) return NO_PROGRESS_STATE;

    return {
      done: this.progress.completed(account.id),
      sync: PROGRESS_PATH,
    };
  }

  private hasFinished(accountId: string, subjectId: string): boolean {
    return this.progress.hasFinished(
      accountId,
      this.tutorials.lessons(subjectId).map((lesson) => lesson.id),
    );
  }

  private lockedCertificate(accountId: string, subject: Subject): string {
    return certificateLockedPage(
      subject,
      this.tutorials.stats(subject.id),
      this.progress.countOf(
        accountId,
        this.tutorials.lessons(subject.id).map((lesson) => lesson.id),
      ),
    );
  }

  private enrolled(req: Request, subject: Subject): boolean {
    const cookies = (req.cookies ?? {}) as Record<string, string>;

    return this.enrolment.isEnrolled(
      subject,
      cookies[this.enrolment.cookieName(subject.id)],
    );
  }

  @Post('progress')
  @HttpCode(204)
  recordProgress(
    @Body('lesson') lessonId: string,
    @Body('done') done: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const account = this.currentAccount(req);
    const known = this.tutorials
      .allTutorials()
      .some((lesson) => lesson.id === lessonId);

    if (!account || !known) {
      res.status(204).end();
      return;
    }

    this.progress.set(account.id, lessonId, done === '1');
    res.status(204).end();
  }

  @Get()
  index(@Req() req: Request, @Res() res: Response): void {
    const subjects = this.tutorials.findSubjects();

    const stats = new Map<string, SubjectStats>();
    const lessonIds = new Map<string, string[]>();

    for (const subject of subjects) {
      stats.set(subject.id, this.tutorials.stats(subject.id));
      lessonIds.set(
        subject.id,
        this.tutorials.lessons(subject.id).map((lesson) => lesson.id),
      );
    }

    res
      .type('html')
      .send(
        tutorialsIndexPage(
          subjects,
          stats,
          lessonIds,
          this.tutorials.totals(),
          this.progressState(req),
        ),
      );
  }

  @Get(':subject')
  subject(
    @Param('subject') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    res.type('html');

    const subject = this.tutorials
      .findSubjects()
      .find((candidate) => candidate.slug === slug);

    if (!subject) {
      res.status(404).send(notFoundPage());
      return;
    }

    res.send(
      subjectPage(
        subject,
        this.tutorials.chapterGroups(subject.id),
        this.tutorials.stats(subject.id),
        {
          locked: !this.enrolled(req, subject),
          error: req.query.error !== undefined,
        },
        this.progressState(req),
      ),
    );
  }

  @Post(':subject/enrol')
  enrol(
    @Param('subject') slug: string,
    @Body('key') key: string,
    @Res() res: Response,
  ): void {
    const subject = this.tutorials
      .findSubjects()
      .find((candidate) => candidate.slug === slug);

    if (!subject) {
      res.type('html').status(404).send(notFoundPage());
      return;
    }

    if (!this.enrolment.verifyKey(subject, key)) {
      res.redirect(`/tutorials/${subject.slug}?error=1`);
      return;
    }

    res.cookie(
      this.enrolment.cookieName(subject.id),
      this.enrolment.issue(subject.id),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: res.req.secure,
        maxAge: this.enrolment.cookieMaxAge,
      },
    );

    res.redirect(`/tutorials/${subject.slug}`);
  }

  @Get(':subject/certificate')
  certificateForm(
    @Param('subject') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    res.type('html');

    const subject = this.tutorials
      .findSubjects()
      .find((candidate) => candidate.slug === slug);

    if (!subject) {
      res.status(404).send(notFoundPage());
      return;
    }

    if (requiresEnrolment(subject) && !this.enrolled(req, subject)) {
      res.redirect(`/tutorials/${subject.slug}`);
      return;
    }

    const account = this.currentAccount(req);

    if (!account) {
      this.signInFirst(res, subject.slug);
      return;
    }

    const existing = this.certificates.find(account.id, subject.id);

    if (!existing && !this.hasFinished(account.id, subject.id)) {
      res.send(this.lockedCertificate(account.id, subject));
      return;
    }

    if (existing) {
      res.send(
        certificatePage(
          subject,
          this.tutorials.stats(subject.id),
          existing.holder,
          account.email,
          new Date(existing.issuedAt),
          getSettings().authorName,
          existing.reference,
        ),
      );
      return;
    }

    res.send(
      certificateFormPage(
        subject,
        this.tutorials.stats(subject.id),
        account.name,
      ),
    );
  }

  @Post(':subject/certificate')
  @HttpCode(200)
  issueCertificate(
    @Param('subject') slug: string,
    @Body('holder') holder: string,
    @Body('contact') contact: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    res.type('html');

    const subject = this.tutorials
      .findSubjects()
      .find((candidate) => candidate.slug === slug);

    if (!subject) {
      res.status(404).send(notFoundPage());
      return;
    }

    if (requiresEnrolment(subject) && !this.enrolled(req, subject)) {
      res.redirect(`/tutorials/${subject.slug}`);
      return;
    }

    const account = this.currentAccount(req);

    if (!account) {
      this.signInFirst(res, subject.slug);
      return;
    }

    if (
      !this.certificates.find(account.id, subject.id) &&
      !this.hasFinished(account.id, subject.id)
    ) {
      res.send(this.lockedCertificate(account.id, subject));
      return;
    }

    const certificate = this.certificates.issue(
      account.id,
      subject.id,
      certificateHolder(holder || account.name),
    );

    res.send(
      certificatePage(
        subject,
        this.tutorials.stats(subject.id),
        certificate.holder,
        certificateContact(contact) || account.email,
        new Date(certificate.issuedAt),
        getSettings().authorName,
        certificate.reference,
      ),
    );
  }

  @Get(':subject/certificate.png')
  async certificateImage(
    @Param('subject') slug: string,
    @Query('holder') holder: string,
    @Query('contact') contact: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const subject = this.tutorials
      .findSubjects()
      .find((candidate) => candidate.slug === slug);

    if (!subject) {
      res.type('html').status(404).send(notFoundPage());
      return;
    }

    if (requiresEnrolment(subject) && !this.enrolled(req, subject)) {
      res.redirect(`/tutorials/${subject.slug}`);
      return;
    }

    const account = this.currentAccount(req);

    if (!account) {
      this.signInFirst(res, subject.slug);
      return;
    }

    const record = this.certificates.find(account.id, subject.id);

    if (!record) {
      res.redirect(`/tutorials/${subject.slug}/certificate`);
      return;
    }

    const stats = this.tutorials.stats(subject.id);
    const name = record.holder;

    const svg = certificateSvg({
      holder: name,
      contact: certificateContact(contact) || account.email,
      course: subject.title,
      detail: `${stats.total} ${stats.total === 1 ? 'lesson' : 'lessons'} · ${formatDuration(stats.minutes)} of reading`,
      issued: new Date(record.issuedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      author: getSettings().authorName,
      reference: record.reference,
    });

    const png = await sharp(Buffer.from(svg)).png().toBuffer();

    res
      .type('png')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="certificate-${subject.slug}.png"`,
      )
      .send(png);
  }

  @Get(':subject/:tutorial')
  tutorial(
    @Param('subject') subjectSlug: string,
    @Param('tutorial') tutorialSlug: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    res.type('html');

    const subject = this.tutorials
      .findSubjects()
      .find((candidate) => candidate.slug === subjectSlug);

    if (!subject) {
      res.status(404).send(notFoundPage());
      return;
    }

    if (requiresEnrolment(subject) && !this.enrolled(req, subject)) {
      res.redirect(`/tutorials/${subject.slug}`);
      return;
    }

    const lessons = this.tutorials.lessons(subject.id);
    const tutorial = lessons.find((lesson) => lesson.slug === tutorialSlug);

    if (!tutorial) {
      res.status(404).send(notFoundPage());
      return;
    }

    this.tutorials.recordView(tutorial.id);

    res.send(
      tutorialPage(
        subject,
        tutorial,
        this.tutorials.chapterGroups(subject.id),
        this.tutorials.neighbours(subject.id, tutorial.id),
        renderMarkdown(tutorial.content),
        this.progressState(req),
      ),
    );
  }
}
