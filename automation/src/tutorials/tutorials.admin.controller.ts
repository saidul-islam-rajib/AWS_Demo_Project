import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { TutorialsService } from './tutorials.service';
import { SubjectStats, parseOrderIds } from './tutorial.model';
import { chapterEditorPage } from '../views/admin/tutorials.page';
import {
  lessonEditorPage,
  subjectEditorPage,
  subjectLessonsPage,
  tutorialsAdminPage,
} from '../views/admin/tutorials.page';

interface SubjectBody {
  title?: string;
  summary?: string;
  icon?: string;
  status?: string;
}

interface LessonBody {
  subjectId?: string;
  chapterId?: string;
  completionSeconds?: string;
  title?: string;
  summary?: string;
  content?: string;
  difficulty?: string;
  status?: string;
  tags?: string;
}

interface MoveBody {
  direction?: string;
}

interface ChapterBody {
  title?: string;
  summary?: string;
}

@Controller('admin/tutorials')
@UseGuards(AuthGuard)
export class TutorialsAdminController {
  constructor(private readonly tutorials: TutorialsService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  index(): string {
    const subjects = this.tutorials.findSubjects(true);

    const stats = new Map<string, SubjectStats>();
    const drafts = new Map<string, number>();

    for (const subject of subjects) {
      stats.set(subject.id, this.tutorials.stats(subject.id));
      drafts.set(
        subject.id,
        this.tutorials
          .lessons(subject.id, true)
          .filter((lesson) => lesson.status === 'draft').length,
      );
    }

    return tutorialsAdminPage(subjects, stats, drafts);
  }

  @Get('subjects/new')
  @Header('Content-Type', 'text/html')
  newSubject(): string {
    return subjectEditorPage();
  }

  @Post('subjects/new')
  createSubject(@Body() body: SubjectBody, @Res() res: Response): void {
    const subject = this.tutorials.createSubject({
      title: body.title ?? '',
      summary: body.summary,
      icon: body.icon,
      status: body.status as never,
    });

    res.redirect(`/admin/tutorials/subjects/${subject.id}`);
  }

  @Get('subjects/:id')
  @Header('Content-Type', 'text/html')
  subjectLessons(@Param('id') id: string): string {
    const subject = this.tutorials.findSubjectById(id);
    return subjectLessonsPage(subject, this.tutorials.chapterGroups(id, true));
  }

  @Get('subjects/:id/edit')
  @Header('Content-Type', 'text/html')
  editSubject(@Param('id') id: string): string {
    return subjectEditorPage(this.tutorials.findSubjectById(id));
  }

  @Post('subjects/:id/edit')
  updateSubject(
    @Param('id') id: string,
    @Body() body: SubjectBody,
    @Res() res: Response,
  ): void {
    this.tutorials.updateSubject(id, {
      title: body.title ?? '',
      summary: body.summary,
      icon: body.icon,
      status: body.status as never,
    });

    res.redirect(`/admin/tutorials/subjects/${id}`);
  }

  @Post('reorder')
  reorderSubjects(
    @Body() body: { order?: string },
    @Res() res: Response,
  ): void {
    this.tutorials.reorderSubjects(parseOrderIds(body.order));
    res.redirect('/admin/tutorials');
  }

  @Post('subjects/:id/reorder')
  reorderLessons(
    @Param('id') id: string,
    @Body() body: { order?: string },
    @Res() res: Response,
  ): void {
    this.tutorials.reorderTutorials(id, parseOrderIds(body.order));
    res.redirect(`/admin/tutorials/subjects/${id}`);
  }

  @Post('subjects/:id/move')
  moveSubject(
    @Param('id') id: string,
    @Body() body: MoveBody,
    @Res() res: Response,
  ): void {
    this.tutorials.moveSubject(id, body.direction === 'up' ? 'up' : 'down');
    res.redirect('/admin/tutorials');
  }

  @Post('subjects/:id/delete')
  deleteSubject(@Param('id') id: string, @Res() res: Response): void {
    this.tutorials.removeSubject(id);
    res.redirect('/admin/tutorials');
  }

  @Get('subjects/:id/chapters/new')
  @Header('Content-Type', 'text/html')
  newChapter(@Param('id') id: string): string {
    return chapterEditorPage(this.tutorials.findSubjectById(id));
  }

  @Post('subjects/:id/chapters/new')
  createChapter(
    @Param('id') id: string,
    @Body() body: ChapterBody,
    @Res() res: Response,
  ): void {
    this.tutorials.createChapter({
      subjectId: id,
      title: body.title ?? '',
      summary: body.summary,
    });

    res.redirect(`/admin/tutorials/subjects/${id}`);
  }

  @Get('chapters/:id/edit')
  @Header('Content-Type', 'text/html')
  editChapter(@Param('id') id: string): string {
    const chapter = this.tutorials.findChapterById(id);

    return chapterEditorPage(
      this.tutorials.findSubjectById(chapter.subjectId),
      chapter,
    );
  }

  @Post('chapters/:id/edit')
  updateChapter(
    @Param('id') id: string,
    @Body() body: ChapterBody,
    @Res() res: Response,
  ): void {
    const chapter = this.tutorials.updateChapter(id, {
      subjectId: '',
      title: body.title ?? '',
      summary: body.summary,
    });

    res.redirect(`/admin/tutorials/subjects/${chapter.subjectId}`);
  }

  @Post('chapters/:id/move')
  moveChapter(
    @Param('id') id: string,
    @Body() body: MoveBody,
    @Res() res: Response,
  ): void {
    const subjectId = this.tutorials.moveChapter(
      id,
      body.direction === 'up' ? 'up' : 'down',
    );

    res.redirect(`/admin/tutorials/subjects/${subjectId}`);
  }

  @Post('chapters/:id/delete')
  deleteChapter(@Param('id') id: string, @Res() res: Response): void {
    const subjectId = this.tutorials.removeChapter(id);
    res.redirect(`/admin/tutorials/subjects/${subjectId}`);
  }

  @Get('subjects/:id/lessons/new')
  @Header('Content-Type', 'text/html')
  newLesson(@Param('id') id: string): string {
    const subject = this.tutorials.findSubjectById(id);
    return lessonEditorPage(
      this.tutorials.findSubjects(true),
      subject,
      undefined,
      this.tutorials.subjectChapters(id),
    );
  }

  @Post('subjects/:id/lessons/new')
  createLesson(
    @Param('id') id: string,
    @Body() body: LessonBody,
    @Res() res: Response,
  ): void {
    const lesson = this.tutorials.createTutorial({
      subjectId: body.subjectId || id,
      chapterId: body.chapterId,
      completionSeconds: body.completionSeconds,
      title: body.title ?? '',
      summary: body.summary,
      content: body.content ?? '',
      difficulty: body.difficulty,
      status: body.status as never,
      tags: body.tags,
    });

    res.redirect(`/admin/tutorials/subjects/${lesson.subjectId}`);
  }

  @Get('lessons/:id/edit')
  @Header('Content-Type', 'text/html')
  editLesson(@Param('id') id: string): string {
    const lesson = this.tutorials.findTutorialById(id);
    const subject = this.tutorials.findSubjectById(lesson.subjectId);

    return lessonEditorPage(
      this.tutorials.findSubjects(true),
      subject,
      lesson,
      this.tutorials.subjectChapters(subject.id),
    );
  }

  @Post('lessons/:id/edit')
  updateLesson(
    @Param('id') id: string,
    @Body() body: LessonBody,
    @Res() res: Response,
  ): void {
    const lesson = this.tutorials.updateTutorial(id, {
      subjectId: body.subjectId ?? '',
      chapterId: body.chapterId,
      completionSeconds: body.completionSeconds,
      title: body.title ?? '',
      summary: body.summary,
      content: body.content ?? '',
      difficulty: body.difficulty,
      status: body.status as never,
      tags: body.tags,
    });

    res.redirect(`/admin/tutorials/subjects/${lesson.subjectId}`);
  }

  @Post('lessons/:id/move')
  moveLesson(
    @Param('id') id: string,
    @Body() body: MoveBody,
    @Res() res: Response,
  ): void {
    const subjectId = this.tutorials.moveTutorial(
      id,
      body.direction === 'up' ? 'up' : 'down',
    );

    res.redirect(`/admin/tutorials/subjects/${subjectId}`);
  }

  @Post('lessons/:id/delete')
  deleteLesson(@Param('id') id: string, @Res() res: Response): void {
    const subjectId = this.tutorials.removeTutorial(id);
    res.redirect(`/admin/tutorials/subjects/${subjectId}`);
  }
}
