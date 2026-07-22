import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TutorialsService } from './tutorials.service';
import { renderMarkdown } from '../posts/markdown';
import { notFoundPage } from '../views/public.pages';
import {
  subjectPage,
  tutorialPage,
  tutorialsIndexPage,
} from '../views/tutorials.page';
import { SubjectStats } from './tutorial.model';

@Controller('tutorials')
export class TutorialsController {
  constructor(private readonly tutorials: TutorialsService) {}

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
  subject(@Param('subject') slug: string, @Res() res: Response): void {
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
        this.tutorials.lessons(subject.id),
        this.tutorials.stats(subject.id),
      ),
    );
  }

  @Get(':subject/:tutorial')
  tutorial(
    @Param('subject') subjectSlug: string,
    @Param('tutorial') tutorialSlug: string,
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
        lessons,
        this.tutorials.neighbours(subject.id, tutorial.id),
        renderMarkdown(tutorial.content),
      ),
    );
  }
}
