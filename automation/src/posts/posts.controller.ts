import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PostsService } from './posts.service';
import { renderMarkdown } from './markdown';
import { homePage, notFoundPage, postPage, tagsPage } from '../views/public.pages';

@Controller()
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  home(): string {
    return homePage({
      posts: this.posts.findPublished(),
      tags: this.posts.tagCounts(),
      stats: this.posts.stats(),
    });
  }

  @Get('search')
  @Header('Content-Type', 'text/html')
  search(@Query('q') q = ''): string {
    return homePage({
      posts: this.posts.search(q),
      tags: this.posts.tagCounts(),
      stats: this.posts.stats(),
      query: q,
    });
  }

  @Get('tags')
  @Header('Content-Type', 'text/html')
  tags(): string {
    return tagsPage(this.posts.tagCounts());
  }

  @Get('tag/:tag')
  @Header('Content-Type', 'text/html')
  byTag(@Param('tag') tag: string): string {
    return homePage({
      posts: this.posts.byTag(tag),
      tags: this.posts.tagCounts(),
      stats: this.posts.stats(),
      activeTag: tag,
    });
  }

  @Get('post/:slug')
  post(@Param('slug') slug: string, @Res() res: Response): void {
    const published = this.posts.findPublished();
    const post = published.find((p) => p.slug === slug);

    res.type('html');

    if (!post) {
      res.status(404).send(notFoundPage());
      return;
    }

    this.posts.recordView(slug);

    // Same tag = related; fall back to most recent when nothing overlaps.
    const related = published
      .filter((p) => p.id !== post.id)
      .map((p) => ({ p, shared: p.tags.filter((t) => post.tags.includes(t)).length }))
      .sort((a, b) => b.shared - a.shared)
      .slice(0, 3)
      .map(({ p }) => p);

    const html = renderMarkdown(post.content);
    res.send(postPage(post, related, html));
  }

  @Get('health')
  health(): { status: string; uptime: number; posts: number } {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      posts: this.posts.findPublished().length,
    };
  }
}
