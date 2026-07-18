import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post as HttpPost,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { renderMarkdown } from './markdown';
import { PostsService } from './posts.service';
import type { PostInput } from './post.model';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { dashboardPage, editorPage, loginPage } from '../views/admin.pages';

@Controller()
export class AdminController {
  constructor(
    private readonly posts: PostsService,
    private readonly auth: AuthService,
  ) {}

  // ---------- auth ----------

  @Get('login')
  @Header('Content-Type', 'text/html')
  loginForm(@Query('error') error?: string): string {
    if (!this.auth.configured) {
      return loginPage(
        undefined,
        'ADMIN_PASSWORD is not set on the server, so sign-in is disabled.',
      );
    }
    return loginPage(error ? 'Incorrect password.' : undefined);
  }

  @HttpPost('login')
  login(@Body('password') password: string, @Res() res: Response): void {
    if (!this.auth.verifyPassword(password ?? '')) {
      res.redirect('/login?error=1');
      return;
    }

    res.cookie(AuthService.COOKIE, this.auth.issueToken(), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: this.auth.cookieMaxAge,
    });
    res.redirect('/admin');
  }

  @Get('logout')
  logout(@Res() res: Response): void {
    res.clearCookie(AuthService.COOKIE);
    res.redirect('/');
  }

  // ---------- dashboard ----------

  @Get('admin')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  dashboard(
    @Query('ok') ok?: string,
    @Query('imported') imported?: string,
    @Query('skipped') skipped?: string,
  ): string {
    const messages: Record<string, string> = {
      created: 'Post created.',
      updated: 'Post updated.',
      deleted: 'Post deleted.',
    };

    let flash: { kind: 'ok' | 'err'; text: string } | undefined;

    if (imported !== undefined) {
      const added = Number(imported);
      flash = {
        kind: 'ok',
        text: added
          ? `Imported ${added} starter post${added === 1 ? '' : 's'}. ${skipped ?? 0} already existed.`
          : 'Nothing to import — all starter posts are already present.',
      };
    } else if (ok && messages[ok]) {
      flash = { kind: 'ok', text: messages[ok] };
    }

    return dashboardPage({
      posts: this.posts.findAll(),
      stats: this.posts.stats(),
      tags: this.posts.tagCounts(),
      flash,
    });
  }

  // ---------- create ----------

  @Get('admin/posts/new')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  newForm(): string {
    return editorPage();
  }

  @HttpPost('admin/posts/new')
  @UseGuards(AuthGuard)
  create(@Body() body: PostInput, @Res() res: Response): void {
    this.posts.create(body);
    res.redirect('/admin?ok=created');
  }

  // ---------- update ----------

  @Get('admin/posts/:id/edit')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  editForm(@Param('id') id: string): string {
    return editorPage(this.posts.findById(id));
  }

  @HttpPost('admin/posts/:id/edit')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() body: PostInput,
    @Res() res: Response,
  ): void {
    this.posts.update(id, body);
    res.redirect('/admin?ok=updated');
  }

  /** Adds starter posts that are missing, without touching existing ones. */
  @HttpPost('admin/import-starters')
  @UseGuards(AuthGuard)
  importStarters(@Res() res: Response): void {
    const { added, skipped } = this.posts.importStarters();
    res.redirect(`/admin?imported=${added}&skipped=${skipped}`);
  }

  // ---------- delete ----------

  @HttpPost('admin/posts/:id/delete')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Res() res: Response): void {
    this.posts.remove(id);
    res.redirect('/admin?ok=deleted');
  }

  /** Renders Markdown for the editor's preview pane. */
  @HttpPost('admin/preview')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  preview(@Body('content') content?: string): string {
    return renderMarkdown(content ?? '');
  }

  /** Session probe used by the e2e tests and for quick manual checks. */
  @Get('admin/session')
  session(@Req() req: Request): { authenticated: boolean } {
    const token = req.cookies?.[AuthService.COOKIE] as string | undefined;
    return { authenticated: this.auth.verifyToken(token) };
  }
}
