import { Controller, Get, Header } from '@nestjs/common';
import { PostsService } from '../posts/posts.service';
import { ProjectsService } from '../projects/projects.service';
import { SettingsService } from '../settings/settings.service';
import { termSlug } from '../projects/project.model';

/** Escape the five characters that are not legal as raw text in XML. */
function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Controller()
export class SeoController {
  constructor(
    private readonly posts: PostsService,
    private readonly projects: ProjectsService,
    private readonly settings: SettingsService,
  ) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  sitemap(): string {
    const base = this.settings.get().siteUrl.replace(/\/+$/, '');

    const entries: { loc: string; lastmod?: string; priority: string }[] = [
      { loc: '/', priority: '1.0' },
      { loc: '/projects', priority: '0.9' },
      { loc: '/about', priority: '0.8' },
      { loc: '/tags', priority: '0.6' },
    ];

    for (const post of this.posts.findPublished()) {
      entries.push({
        loc: `/post/${post.slug}`,
        lastmod: post.updatedAt.slice(0, 10),
        priority: '0.8',
      });
    }

    for (const project of this.projects.findAll()) {
      entries.push({
        loc: `/projects/${project.slug}`,
        lastmod: project.updatedAt.slice(0, 10),
        priority: '0.7',
      });
    }

    for (const { tag } of this.posts.tagCounts()) {
      entries.push({ loc: `/tag/${tag}`, priority: '0.5' });
    }

    // Every taxonomy term is its own indexable page.
    for (const taxonomy of ['tech', 'topics', 'keywords', 'tags'] as const) {
      for (const { term } of this.projects.terms(taxonomy)) {
        entries.push({
          loc: `/${taxonomy}/${termSlug(term)}`,
          priority: '0.5',
        });
      }
    }

    const urls = entries
      .map(
        (e) => `  <url>
    <loc>${xml(base + e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
    <priority>${e.priority}</priority>
  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  robots(): string {
    const base = this.settings.get().siteUrl.replace(/\/+$/, '');

    return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /login

Sitemap: ${base}/sitemap.xml
`;
  }
}
