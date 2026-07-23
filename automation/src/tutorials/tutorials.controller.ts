import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { TutorialsService } from './tutorials.service';
import { renderMarkdown } from '../posts/markdown';
import { notFoundPage } from '../views/public/posts.pages';
import {
  subjectPage,
  tutorialPage,
  tutorialsIndexPage,
} from '../views/public/tutorials.page';
import { Subject, SubjectStats, requiresEnrolment } from './tutorial.model';
import { EnrolmentService } from './enrolment.service';

@Controller('tutorials')
export class TutorialsController {
  constructor(
    private readonly tutorials: TutorialsService,
    private readonly enrolment: EnrolmentService,
  ) {}

  private enrolled(req: Request, subject: Subject): boolean {
    const cookies = (req.cookies ?? {}) as Record<string, string>;

    return this.enrolment.isEnrolled(
      subject,
      cookies[this.enrolment.cookieName(subject.id)],
    );
  }

  @Get()
  index(@Res() res: Response): void {
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
        tutorialsIndexPage(subjects, stats, lessonIds, this.tutorials.totals()),
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
      ),
    );
  }
}
