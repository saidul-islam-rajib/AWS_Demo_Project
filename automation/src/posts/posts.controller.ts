import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { formatDate, Post, readingMinutes } from './post.model';
import { PostsService } from './posts.service';
import { ProjectsService } from '../projects/projects.service';
import { renderMarkdown } from './markdown';
import {
  homePage,
  notFoundPage,
  postPage,
  tagsPage,
} from '../views/public.pages';

@Controller()
export class PostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly projects: ProjectsService,
  ) {}

  private feedStats() {
    const published = this.posts.findPublished();
    const tags = this.posts.tagCounts();

    return {
      ...this.posts.stats(),
      latestDate: published[0]?.publishedAt,
      topTag: tags[0]?.tag,
    };
  }

  @Get()
  @Header('Content-Type', 'text/html')
  home(): string {
    return homePage({
      posts: this.posts.findPublished(),
      tags: this.posts.tagCounts(),
      stats: this.feedStats(),
    });
  }

  @Get('search')
  @Header('Content-Type', 'text/html')
  search(@Query('q') q = ''): string {
    return homePage({
      posts: this.posts.search(q),
      tags: this.posts.tagCounts(),
      stats: this.feedStats(),
      query: q,
    });
  }

  @Get('tags')
  @Header('Content-Type', 'text/html')
  tags(): string {
    const tags = this.posts.tagCounts();

    const featured = tags
      .filter((t) => t.count > 1)
      .slice(0, 6)
      .map((t) => ({
        ...t,
        posts: this.posts.byTag(t.tag).slice(0, 3),
      }));

    return tagsPage({
      tags,
      featured,
      technologies: this.projects.terms('tech'),
      topics: this.projects.terms('topics'),
      keywords: this.projects.terms('keywords'),
      postCount: this.posts.findPublished().length,
      projectCount: this.projects.findAll().length,
    });
  }

  @Get('tag/:tag')
  @Header('Content-Type', 'text/html')
  byTag(@Param('tag') tag: string): string {
    return homePage({
      posts: this.posts.byTag(tag),
      tags: this.posts.tagCounts(),
      stats: this.feedStats(),
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

    const others = published.filter((p) => p.id !== post.id);

    const chosen = post.relatedIds
      .map((id) => others.find((p) => p.id === id))
      .filter((p): p is Post => Boolean(p));

    const related = chosen.length
      ? chosen
      : others
          .map((p) => ({
            p,
            shared: p.tags.filter((t) => post.tags.includes(t)).length,
          }))
          .sort((a, b) => b.shared - a.shared)
          .slice(0, 3)
          .map(({ p }) => p);

    const html = renderMarkdown(post.content);
    res.send(postPage(post, related, html));
  }

  @Get('api/search')
  quickSearch(@Query('q') q = ''): {
    results: { title: string; url: string; kind: string; meta: string }[];
  } {
    const query = q.trim();
    if (query.length < 2) return { results: [] };

    const posts = this.posts
      .search(query)
      .slice(0, 6)
      .map((p) => ({
        title: p.title,
        url: `/post/${p.slug}`,
        kind: 'Post',
        meta: `${formatDate(p.publishedAt)} · ${readingMinutes(p.content)} min read`,
      }));

    const tags = this.posts
      .tagCounts()
      .filter((t) => t.tag.includes(query.toLowerCase()))
      .slice(0, 3)
      .map((t) => ({
        title: t.tag,
        url: `/tag/${t.tag}`,
        kind: 'Tag',
        meta: `${t.count} post${t.count === 1 ? '' : 's'}`,
      }));

    return { results: [...posts, ...tags] };
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
