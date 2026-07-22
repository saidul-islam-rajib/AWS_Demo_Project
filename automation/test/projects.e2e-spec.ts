import request from 'supertest';
import { useTestApp } from './helpers/harness';

const ctx = useTestApp();

describe('projects and SEO', () => {
  const createProject = async (cookie: string, extra = {}) =>
    request(ctx.server)
      .post('/admin/projects/new')
      .set('Cookie', cookie)
      .type('form')
      .send({
        title: 'AWS Demo Project',
        description: 'A blog deployed by Jenkins',
        repoUrl: 'https://github.com/saidul-islam-rajib/AWS_Demo_Project',
        demoUrl: 'https://example.com',
        technologies: 'TypeScript, Docker',
        topics: 'devops',
        keywords: 'ci-cd',
        tags: 'learning',
        year: '2026',
        status: 'ongoing',
        ...extra,
      })
      .expect(302);

  it('seeds starter projects from the public repositories', () =>
    request(ctx.server)
      .get('/projects')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('AWS Demo Project');
        expect(res.text).toContain('Bachelor Mess Manager');
        expect(res.text).toContain('opengraph.githubassets.com');
      }));

  it('requires a session to manage projects', () =>
    request(ctx.server)
      .get('/admin/projects')
      .expect(302)
      .expect('Location', '/login'));

  it('creates a project and shows it grouped by year', async () => {
    const cookie = await ctx.signIn();
    await createProject(cookie);

    await request(ctx.server)
      .get('/projects')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('AWS Demo Project');
        expect(res.text).toContain('2026');
        expect(res.text).toContain('Ongoing');
        expect(res.text).toContain('opengraph.githubassets.com');
      });
  });

  it('serves the detail page with Open Graph tags and structured data', async () => {
    const cookie = await ctx.signIn();
    await createProject(cookie);

    await request(ctx.server)
      .get('/projects/aws-demo-project')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('property="og:title"');
        expect(res.text).toContain('property="og:image"');
        expect(res.text).toContain('name="twitter:card"');
        expect(res.text).toContain('summary_large_image');
        expect(res.text).toContain('SoftwareSourceCode');
        expect(res.text).toContain('rel="canonical"');
        expect(res.text).toContain('github.com/saidul-islam-rajib');
      });
  });

  it('gives every taxonomy its own page', async () => {
    const cookie = await ctx.signIn();
    await createProject(cookie);
    const server = ctx.server;

    for (const path of [
      '/tech/typescript',
      '/tech/docker',
      '/topics/devops',
      '/keywords/ci-cd',
      '/tags/learning',
    ]) {
      await request(server)
        .get(path)
        .expect(200)
        .expect((res) => expect(res.text).toContain('AWS Demo Project'));
    }
  });

  it('filters by year and by search', async () => {
    const cookie = await ctx.signIn();
    await createProject(cookie);
    await createProject(cookie, { title: 'Old Thing', year: '2020' });
    const server = ctx.server;

    await request(server)
      .get('/projects?year=2020')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Old Thing');
        expect(res.text).not.toContain('>AWS Demo Project</h3>');
      });

    await request(server)
      .get('/projects?q=jenkins')
      .expect(200)
      .expect((res) => expect(res.text).toContain('AWS Demo Project'));
  });

  it('deletes a project', async () => {
    const cookie = await ctx.signIn();
    await createProject(cookie);
    const server = ctx.server;

    const admin = await request(server)
      .get('/admin/projects')
      .set('Cookie', cookie)
      .expect(200);
    const id = /\/admin\/projects\/([0-9a-f-]{36})\/edit/.exec(admin.text)?.[1];
    expect(id).toBeDefined();

    await request(server)
      .post(`/admin/projects/${id}/delete`)
      .set('Cookie', cookie)
      .expect(302);

    await request(server).get('/projects/aws-demo-project').expect(404);
  });

  it('serves a sitemap listing posts, projects and taxonomies', async () => {
    const cookie = await ctx.signIn();
    await createProject(cookie);

    await request(ctx.server)
      .get('/sitemap.xml')
      .expect(200)
      .expect('Content-Type', /xml/)
      .expect((res) => {
        expect(res.text).toContain('<urlset');
        expect(res.text).toContain('/projects/aws-demo-project');
        expect(res.text).toContain('/tech/typescript');
        expect(res.text).toContain('/post/');
      });
  });

  it('serves robots.txt pointing at the sitemap and blocking admin', () =>
    request(ctx.server)
      .get('/robots.txt')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Disallow: /admin');
        expect(res.text).toContain('Sitemap:');
      }));

  it('serves an RSS feed of published posts', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .post('/admin/posts/new')
      .set('Cookie', cookie)
      .type('form')
      .send({
        title: 'Feed Me',
        content: 'Body text.',
        status: 'published',
        tags: 'rss',
      })
      .expect(302);

    await request(ctx.server)
      .get('/feed.xml')
      .expect(200)
      .expect('Content-Type', /application\/rss\+xml/)
      .expect((res) => {
        expect(res.text).toContain('<rss version="2.0"');
        expect(res.text).toContain('<title>Feed Me</title>');
        expect(res.text).toContain('/post/feed-me');
        expect(res.text).toContain('<category>rss</category>');
        expect(res.text).toMatch(
          /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4}/,
        );
      });
  });

  it('keeps drafts and scheduled posts out of the feed', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/posts/new')
      .set('Cookie', cookie)
      .type('form')
      .send({ title: 'Secret Draft', content: 'x', status: 'draft' })
      .expect(302);

    await request(server)
      .post('/admin/posts/new')
      .set('Cookie', cookie)
      .type('form')
      .send({
        title: 'Not Yet Out',
        content: 'x',
        status: 'published',
        publishedAt: new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .slice(0, 16),
      })
      .expect(302);

    await request(server)
      .get('/feed.xml')
      .expect(200)
      .expect((res) => {
        expect(res.text).not.toContain('Secret Draft');
        expect(res.text).not.toContain('Not Yet Out');
      });
  });

  it('advertises the feed for autodiscovery', () =>
    request(ctx.server)
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain(
          'rel="alternate" type="application/rss+xml"',
        );
        expect(res.text).toContain('/feed.xml');
      }));

  it('lists tutorial subjects and lessons in the sitemap', () =>
    request(ctx.server)
      .get('/sitemap.xml')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('/tutorials</loc>');
        expect(res.text).toContain('/tutorials/networking</loc>');
        expect(res.text).toMatch(/\/tutorials\/networking\/[a-z0-9-]+<\/loc>/);
      }));
});
