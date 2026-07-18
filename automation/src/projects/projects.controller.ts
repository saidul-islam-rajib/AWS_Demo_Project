import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post as HttpPost,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { ProjectsService } from './projects.service';
import type { ProjectInput } from './project.model';
import { Taxonomy } from './project.model';
import { SettingsService } from '../settings/settings.service';
import { renderMarkdown } from '../posts/markdown';
import {
  projectDetailPage,
  projectsPage,
  taxonomyPage,
} from '../views/projects.page';
import {
  projectEditorPage,
  projectsAdminPage,
} from '../views/projects.admin.page';

/** Rows per page in the admin list. */
const ADMIN_PAGE_SIZE = 10;

@Controller()
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly settings: SettingsService,
  ) {}

  // ---------- public ----------

  @Get('projects')
  @Header('Content-Type', 'text/html')
  list(
    @Query('q') q = '',
    @Query('year') year = '',
    @Query('tech') tech = '',
  ): string {
    let results = this.projects.findAll();

    if (tech) results = this.projects.byTerm('tech', tech);
    if (year) results = results.filter((p) => p.year === year);
    if (q) results = this.projects.search(q, results);

    return projectsPage({
      groups: this.projects.byYear(results),
      total: results.length,
      years: this.projects.years(),
      techs: this.projects.terms('tech'),
      query: q,
      activeYear: year,
      activeTech: tech,
    });
  }

  @Get('projects/:slug')
  detail(@Param('slug') slug: string, @Res() res: Response): void {
    res.type('html');

    const project = this.projects.findAll().find((p) => p.slug === slug);

    if (!project) {
      res.status(404).send(
        taxonomyPage({
          taxonomy: 'tags',
          term: 'Not found',
          slug: 'not-found',
          projects: [],
        }),
      );
      return;
    }

    // Rank by shared technologies first, then anything from the same year.
    const related = this.projects
      .findAll()
      .filter((p) => p.id !== project.id)
      .map((p) => ({
        p,
        score:
          p.technologies.filter((t) => project.technologies.includes(t))
            .length *
            2 +
          p.topics.filter((t) => project.topics.includes(t)).length +
          (p.year === project.year ? 1 : 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.p);

    res.send(
      projectDetailPage(
        project,
        related,
        renderMarkdown(project.detailedDescription ?? ''),
      ),
    );
  }

  @Get('tech/:slug')
  @Header('Content-Type', 'text/html')
  byTech(@Param('slug') slug: string): string {
    return this.taxonomy('tech', slug);
  }

  @Get('topics/:slug')
  @Header('Content-Type', 'text/html')
  byTopic(@Param('slug') slug: string): string {
    return this.taxonomy('topics', slug);
  }

  @Get('keywords/:slug')
  @Header('Content-Type', 'text/html')
  byKeyword(@Param('slug') slug: string): string {
    return this.taxonomy('keywords', slug);
  }

  @Get('tags/:slug')
  @Header('Content-Type', 'text/html')
  byProjectTag(@Param('slug') slug: string): string {
    return this.taxonomy('tags', slug);
  }

  private taxonomy(taxonomy: Taxonomy, slug: string): string {
    return taxonomyPage({
      taxonomy,
      term: this.projects.termLabel(taxonomy, slug),
      slug,
      projects: this.projects.byTerm(taxonomy, slug),
    });
  }

  // ---------- admin ----------

  @Get('admin/projects')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  admin(
    @Query('q') q = '',
    @Query('page') pageParam?: string,
    @Query('ok') ok?: string,
    @Query('added') added?: string,
    @Query('skipped') skipped?: string,
    @Query('error') error?: string,
  ): string {
    const messages: Record<string, string> = {
      created: 'Project created.',
      updated: 'Project updated.',
      deleted: 'Project deleted.',
    };

    let flash: { kind: 'ok' | 'err'; text: string } | undefined;

    if (error) {
      flash = { kind: 'err', text: error };
    } else if (added !== undefined) {
      const count = Number(added);
      flash = {
        kind: 'ok',
        text: count
          ? `Imported ${count} project${count === 1 ? '' : 's'} from GitHub. ${skipped ?? 0} already existed.`
          : 'Nothing new to import — every repository is already here.',
      };
    } else if (ok && messages[ok]) {
      flash = { kind: 'ok', text: messages[ok] };
    }

    const all = this.projects.search(q);
    const pageCount = Math.max(1, Math.ceil(all.length / ADMIN_PAGE_SIZE));

    // Clamp rather than 404: a stale bookmark should still show something.
    const parsed = Number.parseInt(pageParam ?? '1', 10);
    const page = Math.min(
      Math.max(Number.isFinite(parsed) ? parsed : 1, 1),
      pageCount,
    );

    const start = (page - 1) * ADMIN_PAGE_SIZE;

    return projectsAdminPage({
      projects: all.slice(start, start + ADMIN_PAGE_SIZE),
      githubUser: this.settings.get().githubUser,
      flash,
      page,
      pageCount,
      total: all.length,
      query: q,
    });
  }

  @Get('admin/projects/new')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  newForm(): string {
    return projectEditorPage();
  }

  @HttpPost('admin/projects/new')
  @UseGuards(AuthGuard)
  create(@Body() body: ProjectInput, @Res() res: Response): void {
    this.projects.create(body);
    res.redirect('/admin/projects?ok=created');
  }

  @Get('admin/projects/:id/edit')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  editForm(@Param('id') id: string): string {
    return projectEditorPage(this.projects.findById(id));
  }

  @HttpPost('admin/projects/:id/edit')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() body: ProjectInput,
    @Res() res: Response,
  ): void {
    this.projects.update(id, body);
    res.redirect('/admin/projects?ok=updated');
  }

  @HttpPost('admin/projects/:id/delete')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Res() res: Response): void {
    this.projects.remove(id);
    res.redirect('/admin/projects?ok=deleted');
  }

  @HttpPost('admin/projects/import')
  @UseGuards(AuthGuard)
  async importGithub(@Res() res: Response): Promise<void> {
    const user = this.settings.get().githubUser;
    const result = await this.projects.importFromGithub(user);

    if (result.error) {
      res.redirect(`/admin/projects?error=${encodeURIComponent(result.error)}`);
      return;
    }

    res.redirect(
      `/admin/projects?added=${result.added}&skipped=${result.skipped}`,
    );
  }
}
