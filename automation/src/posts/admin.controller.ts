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
import { LoginThrottleService } from '../auth/login-throttle.service';
import { dashboardPage, editorPage, loginPage } from '../views/admin.pages';

/** Rows per dashboard page. */
const PAGE_SIZE = 10;

/**
 * Which client a sign-in attempt is counted against.
 *
 * Deliberately the socket address and not X-Forwarded-For: that header is
 * client-supplied, so trusting it here would let an attacker reset their own
 * limit by changing one string per request. Express fills req.ip from the
 * header only when `trust proxy` is enabled, which it is not — so putting a
 * reverse proxy in front of this app means enabling that setting, otherwise
 * every visitor arrives as the proxy and shares one bucket.
 */
function clientKey(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

@Controller()
export class AdminController {
  constructor(
    private readonly posts: PostsService,
    private readonly auth: AuthService,
    private readonly throttle: LoginThrottleService,
  ) {}

  // ---------- auth ----------

  @Get('login')
  @Header('Content-Type', 'text/html')
  loginForm(
    @Req() req: Request,
    @Query('error') error?: string,
    @Query('locked') locked?: string,
  ): string {
    if (!this.auth.configured) {
      return loginPage(
        undefined,
        'ADMIN_PASSWORD is not set on the server, so sign-in is disabled.',
      );
    }

    if (locked !== undefined) {
      const ms = this.throttle.retryAfter(clientKey(req));
      const minutes = Math.max(1, Math.ceil(ms / 60000));

      return loginPage(
        ms > 0
          ? `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
          : 'Too many failed attempts. You can try again now.',
      );
    }

    return loginPage(error ? 'Incorrect password.' : undefined);
  }

  @HttpPost('login')
  login(
    @Body('password') password: string,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const client = clientKey(req);

    // Checked before the password is even looked at, so a locked address
    // gains nothing by continuing to guess.
    if (this.throttle.blocked(client)) {
      res.redirect('/login?locked=1');
      return;
    }

    if (!this.auth.verifyPassword(password ?? '')) {
      const justLocked = this.throttle.recordFailure(client);
      res.redirect(justLocked ? '/login?locked=1' : '/login?error=1');
      return;
    }

    this.throttle.recordSuccess(client);

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
    @Query('q') q = '',
    @Query('page') pageParam?: string,
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

    const matched = this.posts.searchAll(q);
    const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));

    // Clamp rather than 404: a stale bookmark should still show something.
    const parsed = Number.parseInt(pageParam ?? '1', 10);
    const page = Math.min(
      Math.max(Number.isFinite(parsed) ? parsed : 1, 1),
      pageCount,
    );

    const start = (page - 1) * PAGE_SIZE;

    return dashboardPage({
      posts: matched.slice(start, start + PAGE_SIZE),
      stats: this.posts.stats(),
      tags: this.posts.tagCounts(),
      flash,
      query: q,
      page,
      pageCount,
      total: matched.length,
    });
  }

  // ---------- create ----------

  @Get('admin/posts/new')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html')
  newForm(): string {
    return editorPage(undefined, this.posts.findAll());
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
    return editorPage(this.posts.findById(id), this.posts.findAll());
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
