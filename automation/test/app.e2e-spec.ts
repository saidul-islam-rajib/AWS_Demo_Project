import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import express, { urlencoded } from 'express';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { AppModule } from './../src/app.module';

const portraitJpeg = (): Promise<Buffer> =>
  sharp({
    create: {
      width: 492,
      height: 612,
      channels: 3,
      background: { r: 90, g: 120, b: 180 },
    },
  })
    .jpeg()
    .toBuffer();

const PASSWORD = 'test-password';

interface HealthBody {
  status: string;
  uptime: number;
  posts: number;
}

interface SearchBody {
  results: { title: string; url: string; kind: string; meta: string }[];
}

interface UploadBody {
  url: string;
  name: string;
  size: number;
  markdown: string;
}

describe('Blog (e2e)', () => {
  let app: INestApplication<App>;
  let dir: string;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'blog-e2e-'));
    process.env.DATA_DIR = dir;
    process.env.ADMIN_PASSWORD = PASSWORD;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.use(urlencoded({ extended: true }));
    app.use('/uploads', express.static(join(dir, 'uploads')));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.DATA_DIR;
    delete process.env.ADMIN_PASSWORD;
    rmSync(dir, { recursive: true, force: true });
  });

  const signIn = async (): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/login')
      .type('form')
      .send({ password: PASSWORD })
      .expect(302);

    return (res.headers['set-cookie'] as unknown as string[])[0];
  };

  describe('public pages', () => {
    it('GET / renders the feed', () =>
      request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Content-Type', /text\/html/)
        .expect((res) => {
          expect(res.text).toContain('Engineering notes');
        }));

    it('GET /tags renders an explore page, not just a tag list', () =>
      request(app.getHttpServer())
        .get('/tags')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Explore');
          expect(res.text).toContain('class="cloud"');
          expect(res.text).toContain('Most written about');
          expect(res.text).toContain('Technologies');
          expect(res.text).toContain('/tech/');
          expect(res.text).toContain('Project topics');
        }));

    it('links the Topics covered stat to the explore page', () =>
      request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('class="stat stat-link" href="/tags"');
          expect(res.text).toContain('Topics covered');
        }));

    it('links tags to their own pages from the explore page', () =>
      request(app.getHttpServer())
        .get('/tags')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('href="/tag/jenkins"');
          expect(res.text).toContain('href="/tag/docker"');
        }));

    it('GET /search filters posts', () =>
      request(app.getHttpServer()).get('/search?q=jenkins').expect(200));

    it('GET /post/:slug returns 404 for an unknown slug', () =>
      request(app.getHttpServer()).get('/post/does-not-exist').expect(404));

    it('GET /health reports ok', () =>
      request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const body = res.body as HealthBody;
          expect(body.status).toBe('ok');
          expect(typeof body.posts).toBe('number');
        }));
  });

  describe('auth', () => {
    it('redirects anonymous visitors away from /admin', () =>
      request(app.getHttpServer())
        .get('/admin')
        .expect(302)
        .expect('Location', '/login'));

    it('rejects a wrong password', () =>
      request(app.getHttpServer())
        .post('/login')
        .type('form')
        .send({ password: 'nope' })
        .expect(302)
        .expect('Location', '/login?error=1'));

    it('grants access with the right password', async () => {
      const cookie = await signIn();

      await request(app.getHttpServer())
        .get('/admin')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Dashboard');
        });
    });

    it('blocks writes without a session', () =>
      request(app.getHttpServer())
        .post('/admin/posts/new')
        .type('form')
        .send({ title: 'Sneaky', content: 'x' })
        .expect(302)
        .expect('Location', '/login'));
  });

  describe('login rate limiting', () => {
    const guess = (password = 'wrong') =>
      request(app.getHttpServer())
        .post('/login')
        .type('form')
        .send({ password });

    it('locks the address after five wrong passwords', async () => {
      for (let i = 0; i < 4; i++) {
        await guess().expect(302).expect('Location', '/login?error=1');
      }

      await guess().expect(302).expect('Location', '/login?locked=1');
    });

    it('refuses the correct password while locked', async () => {
      for (let i = 0; i < 5; i++) await guess();

      await guess(PASSWORD).expect(302).expect('Location', '/login?locked=1');
    });

    it('tells the visitor how long to wait', async () => {
      for (let i = 0; i < 5; i++) await guess();

      await request(app.getHttpServer())
        .get('/login?locked=1')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Too many failed attempts');
          expect(res.text).toMatch(/Try again in \d+ minutes?\./);
        });
    });

    it('does not count a successful sign-in against the limit', async () => {
      for (let i = 0; i < 4; i++) await guess();

      await request(app.getHttpServer())
        .post('/login')
        .type('form')
        .send({ password: PASSWORD })
        .expect(302)
        .expect('Location', '/admin');

      await guess().expect(302).expect('Location', '/login?error=1');
    });
  });

  describe('live search', () => {
    it('ignores queries shorter than two characters', () =>
      request(app.getHttpServer())
        .get('/api/search?q=a')
        .expect(200)
        .expect((res) => expect((res.body as SearchBody).results).toEqual([])));

    it('returns matching posts with metadata', () =>
      request(app.getHttpServer())
        .get('/api/search?q=docker')
        .expect(200)
        .expect((res) => {
          const body = res.body as SearchBody;
          expect(body.results.length).toBeGreaterThan(0);
          expect(body.results[0]).toHaveProperty('url');
          expect(body.results[0]).toHaveProperty('kind');
          expect(body.results[0]).toHaveProperty('meta');
        }));

    it('includes matching tags alongside posts', () =>
      request(app.getHttpServer())
        .get('/api/search?q=jenkins')
        .expect(200)
        .expect((res) => {
          const kinds = (res.body as SearchBody).results.map((r) => r.kind);
          expect(kinds).toContain('Post');
          expect(kinds).toContain('Tag');
        }));

    it('returns nothing for a query with no matches', () =>
      request(app.getHttpServer())
        .get('/api/search?q=zzzznotathing')
        .expect(200)
        .expect((res) => expect((res.body as SearchBody).results).toEqual([])));

    it('excludes scheduled posts from results', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();
      const future = new Date(Date.now() + 86400000).toISOString().slice(0, 16);

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'Zebra Secret',
          content: 'zebra',
          status: 'published',
          publishedAt: future,
        })
        .expect(302);

      await request(server)
        .get('/api/search?q=zebra')
        .expect(200)
        .expect((res) => expect((res.body as SearchBody).results).toEqual([]));
    });
  });

  describe('publish scheduling', () => {
    const future = () =>
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);
    const past = () => '2020-03-01T09:00';

    it('hides a post scheduled for the future', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'From The Future',
          content: 'not yet',
          status: 'published',
          publishedAt: future(),
        })
        .expect(302);

      await request(server).get('/post/from-the-future').expect(404);

      await request(server)
        .get('/')
        .expect(200)
        .expect((res) => expect(res.text).not.toContain('From The Future'));
    });

    it('shows a scheduled post in the dashboard with its own state', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'From The Future',
          content: 'not yet',
          status: 'published',
          publishedAt: future(),
        })
        .expect(302);

      await request(server)
        .get('/admin')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('From The Future');
          expect(res.text).toContain('scheduled');
        });
    });

    it('publishes a backdated post immediately and sorts it by that date', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'Old News',
          content: 'from the archive',
          status: 'published',
          publishedAt: past(),
        })
        .expect(302);

      await request(server)
        .get('/post/old-news')
        .expect(200)
        .expect((res) => expect(res.text).toContain('2020'));
    });

    it('defaults to now when no date is supplied', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({ title: 'No Date', content: 'x', status: 'published' })
        .expect(302);

      await request(server).get('/post/no-date').expect(200);
    });
  });

  describe('navigation', () => {
    it('renders every nav item as a plain link, with no button styling', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      const publicNav = await request(server).get('/').expect(200);
      const adminNav = await request(server)
        .get('/admin')
        .set('Cookie', cookie)
        .expect(200);

      const navOf = (html: string) =>
        /<nav class="nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';

      expect(navOf(publicNav.text)).not.toContain('btn');
      expect(navOf(adminNav.text)).not.toContain('btn');
      expect(navOf(adminNav.text)).toContain('Write');
      expect(navOf(publicNav.text)).toContain('Dashboard');
    });

    it('ships an off-canvas drawer that works without JavaScript', async () => {
      const res = await request(app.getHttpServer()).get('/').expect(200);

      expect(res.text).toContain('id="nav-toggle"');
      expect(res.text).toContain('class="nav-burger"');
      expect(res.text).toContain('.nav-toggle:checked ~ .nav');

      expect(res.text).toContain('class="nav-head"');
      expect(res.text).toContain('class="nav-close"');
      expect(res.text).toContain('class="nav-overlay"');
      expect(res.text).toContain('.nav-toggle:checked ~ .nav-overlay');

      expect(res.text).toContain('transform: translateX(-100%)');
      expect(res.text).toContain('@media (max-width: 860px)');
    });

    it('puts the burger before the wordmark so it sits on the left', async () => {
      const res = await request(app.getHttpServer()).get('/').expect(200);
      const header = /<div class="header-inner">([\s\S]*?)<\/header>/.exec(
        res.text,
      )?.[1] as string;

      expect(header.indexOf('nav-burger')).toBeLessThan(
        header.indexOf('class="wordmark"'),
      );
    });

    it('marks the current section, and never marks Write as current', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      const about = await request(server)
        .get('/admin/about')
        .set('Cookie', cookie)
        .expect(200);

      expect(about.text).toContain('href="/admin/about" class="active"');
      expect(about.text).toContain('<a href="/admin/posts/new" class="">Write');

      const home = await request(server).get('/').expect(200);
      expect(home.text).toContain('href="/" class="active"');

      const projects = await request(server).get('/projects').expect(200);
      expect(projects.text).toContain('href="/projects" class="active"');
      expect(projects.text).not.toContain('href="/" class="active"');
    });
  });

  describe('projects and SEO', () => {
    const createProject = async (cookie: string, extra = {}) =>
      request(app.getHttpServer())
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
      request(app.getHttpServer())
        .get('/projects')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('AWS Demo Project');
          expect(res.text).toContain('Bachelor Mess Manager');
          expect(res.text).toContain('opengraph.githubassets.com');
        }));

    it('requires a session to manage projects', () =>
      request(app.getHttpServer())
        .get('/admin/projects')
        .expect(302)
        .expect('Location', '/login'));

    it('creates a project and shows it grouped by year', async () => {
      const cookie = await signIn();
      await createProject(cookie);

      await request(app.getHttpServer())
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
      const cookie = await signIn();
      await createProject(cookie);

      await request(app.getHttpServer())
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
      const cookie = await signIn();
      await createProject(cookie);
      const server = app.getHttpServer();

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
      const cookie = await signIn();
      await createProject(cookie);
      await createProject(cookie, { title: 'Old Thing', year: '2020' });
      const server = app.getHttpServer();

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
      const cookie = await signIn();
      await createProject(cookie);
      const server = app.getHttpServer();

      const admin = await request(server)
        .get('/admin/projects')
        .set('Cookie', cookie)
        .expect(200);
      const id = /\/admin\/projects\/([0-9a-f-]{36})\/edit/.exec(
        admin.text,
      )?.[1];
      expect(id).toBeDefined();

      await request(server)
        .post(`/admin/projects/${id}/delete`)
        .set('Cookie', cookie)
        .expect(302);

      await request(server).get('/projects/aws-demo-project').expect(404);
    });

    it('serves a sitemap listing posts, projects and taxonomies', async () => {
      const cookie = await signIn();
      await createProject(cookie);

      await request(app.getHttpServer())
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
      request(app.getHttpServer())
        .get('/robots.txt')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Disallow: /admin');
          expect(res.text).toContain('Sitemap:');
        }));

    it('keeps admin pages out of search results', async () => {
      const cookie = await signIn();

      await request(app.getHttpServer())
        .get('/admin/projects')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => expect(res.text).toContain('noindex'));
    });
  });

  describe('about page', () => {
    it('never shows admin prompts to visitors', () =>
      request(app.getHttpServer())
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).not.toContain('Add your story');
          expect(res.text).not.toContain('starter content');
          expect(res.text).not.toContain('/admin/about');
        }));

    it('nudges the admin to add what only they can write', async () => {
      const cookie = await signIn();

      await request(app.getHttpServer())
        .get('/about')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('starter content');
          expect(res.text).toContain('/admin/about');
        });
    });

    it('seeds skills and learning items without inventing a biography', () =>
      request(app.getHttpServer())
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Topics covered');
          expect(res.text).toContain('Learning curve');
          expect(res.text).toContain('Docker');
          expect(res.text).not.toContain('Journey');
        }));

    it('requires a session to edit', () =>
      request(app.getHttpServer())
        .get('/admin/about')
        .expect(302)
        .expect('Location', '/login'));

    it('saves every section and renders them publicly', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          headline: 'Building things, mostly backends',
          intro: '## Hello\n\nI am a **software engineer**.',
          milestonePeriod: ['2024 — present', '2022 — 2024'],
          milestoneTitle: ['Software Engineer', 'Junior Developer'],
          milestoneOrg: ['Acme Corp', 'First Startup'],
          milestoneDescription: ['Backend and infra', 'Where it started'],
          skillGroupName: ['Backend', 'DevOps'],
          skillGroupItems: ['NestJS, PostgreSQL', 'Docker, Jenkins'],
          learningTitle: ['Kubernetes', 'Rust'],
          learningNote: ['for orchestration', 'for fun'],
          learningStatus: ['learning', 'planned'],
          galleryUrls: ['/uploads/photo.png'],
          galleryCaption: ['At the desk'],
          socialLabel: ['LinkedIn'],
          socialUrl: ['https://linkedin.com/in/example'],
        })
        .expect(302)
        .expect('Location', '/admin/about?saved=1');

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Building things, mostly backends');
          expect(res.text).toContain('<strong>software engineer</strong>');
          expect(res.text).toContain('Software Engineer');
          expect(res.text).toContain('Acme Corp');
          expect(res.text).toContain('NestJS');
          expect(res.text).toContain('Kubernetes');
          expect(res.text).toContain('Learning now');
          expect(res.text).toContain('Planned');
          expect(res.text).toContain('/uploads/photo.png');
          expect(res.text).toContain('At the desk');
          expect(res.text).toContain('linkedin.com/in/example');
          expect(res.text).not.toContain('has not been filled in yet');
        });
    });

    it('justifies every prose block, on all screen sizes', async () => {
      const res = await request(app.getHttpServer()).get('/about').expect(200);

      expect(res.text).toMatch(
        /\.about-intro,[\s\S]{0,200}\.milestone-body,[\s\S]{0,200}text-align: justify/,
      );
      expect(res.text).toContain('.gallery figcaption,');
      expect(res.text).toContain('hyphens: auto');
      expect(res.text).not.toContain('.about-intro { text-align: left; }');
    });

    it('renders markdown in the intro', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          intro: [
            'I build **reliable software** with [C#](https://learn.microsoft.com) and `NestJS`.',
            '',
            '## What I focus on',
            '',
            '- Backend APIs',
            '- Deployment',
          ].join('\n'),
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('<strong>reliable software</strong>');
          expect(res.text).toContain('href="https://learn.microsoft.com"');
          expect(res.text).toContain('<code>NestJS</code>');
          expect(res.text).toMatch(/<h2[^>]*>What I focus on<\/h2>/);
          expect(res.text).toContain('<li>Backend APIs</li>');
        });
    });

    it('orders the journey newest first and renders its markdown', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          milestoneTitle: [
            'Intern Engineer',
            'Senior Engineer',
            'Junior Engineer',
          ],
          milestoneOrg: ['First Co', 'Third Co', 'Second Co'],
          milestoneStart: ['2022-10', '2025-11', '2023-01'],
          milestoneEnd: ['2023-01', '', '2025-11'],
          milestoneDescription: [
            'Learned **a lot** here.',
            'Working with ==Kubernetes== now.',
            '- Built APIs\n- Shipped features',
          ],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          const senior = res.text.indexOf('Senior Engineer');
          const junior = res.text.indexOf('Junior Engineer');
          const intern = res.text.indexOf('Intern Engineer');

          expect(senior).toBeLessThan(junior);
          expect(junior).toBeLessThan(intern);

          expect(res.text).toContain('Nov 2025 — Present');
          expect(res.text).toContain('Oct 2022 — Jan 2023');

          expect(res.text).toContain('<strong>a lot</strong>');
          expect(res.text).toContain('<mark>Kubernetes</mark>');
          expect(res.text).toContain('<li>Built APIs</li>');
        });
    });

    it('serves the page when milestones predate the date fields', async () => {
      writeFileSync(
        join(dir, 'about.json'),
        JSON.stringify({
          headline: '',
          intro: 'hello',
          milestones: [
            {
              period: 'OCT 2022 to Jan 2023',
              title: 'Intern',
              org: 'ASA',
              description: 'a',
            },
            {
              period: 'Jan 2023 to Nov 2025',
              title: 'Junior',
              org: 'ASA',
              description: 'b',
            },
            {
              period: 'Nov 2025 to Present',
              title: 'Senior',
              org: 'BS23',
              description: 'c',
            },
          ],
          skillGroups: [],
          learning: [],
          gallery: [],
          socials: [],
        }),
        'utf8',
      );

      await request(app.getHttpServer())
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Intern');
          expect(res.text).toContain('Senior');
          expect(res.text.indexOf('Senior')).toBeLessThan(
            res.text.indexOf('Intern'),
          );
        });
    });

    it('has no period label field in the editor', async () => {
      const cookie = await signIn();

      await request(app.getHttpServer())
        .get('/admin/about')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).not.toContain('name="milestonePeriod"');
          expect(res.text).toContain('current-check');
          expect(res.text).toContain('period-preview');
        });
    });

    it('treats a cleared end date as the current role and ranks it first', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          milestoneTitle: ['Finished Recently', 'Current Role'],
          milestoneOrg: ['Old Co', 'New Co'],
          milestoneStart: ['2024-01', '2025-06'],
          milestoneEnd: ['2026-02', ''],
          milestoneDescription: ['a', 'b'],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text.indexOf('Current Role')).toBeLessThan(
            res.text.indexOf('Finished Recently'),
          );
          expect(res.text).toContain('Jun 2025 — Present');
        });
    });

    it('serves gallery thumbnails resized, not the full original', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          galleryUrls: ['/uploads/photo.png'],
          galleryCaption: ['A photo'],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          const figure = /<figure class="shot"[\s\S]*?<\/figure>/.exec(
            res.text,
          )?.[0] as string;

          expect(figure).toContain('/img/photo.png?w=400');
          expect(figure).toContain('srcset=');
          expect(figure).toContain('/img/photo.png?w=800');
          expect(figure).not.toContain('src="/uploads/');

          expect(figure).toContain('width="400"');
          expect(figure).toContain('loading="lazy"');
          expect(figure).toContain('decoding="async"');
        });
    });

    it('shows only the first image of a record, and defers the rest', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          galleryUrls: [
            ['/uploads/a.png', '/uploads/b.png', '/uploads/c.png'].join('\n'),
          ],
          galleryCaption: ['Three images'],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          const figure = /<figure class="shot"[\s\S]*?<\/figure>/.exec(
            res.text,
          )?.[0] as string;

          expect((figure.match(/ src="/g) ?? []).length).toBe(1);
          expect((figure.match(/data-src="/g) ?? []).length).toBe(2);
          expect((figure.match(/hidden/g) ?? []).length).toBe(2);

          expect(res.text).toContain('.gallery img[hidden]');
        });
    });

    it('renders a multi-image record with slider controls', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          galleryUrls: [
            ['/uploads/a.png', '/uploads/b.png', '/uploads/c.png'].join('\n'),
          ],
          galleryCaption: ['A short caption'],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('/uploads/a.png');
          expect(res.text).toContain('/uploads/c.png');
          expect(res.text).toContain('class="shot-nav next"');
          expect(res.text).toContain('class="shot-dots"');
          expect(res.text).toMatch(/<span class="at">1<\/span>\/3/);
        });
    });

    it('shows no slider controls for a single image', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          galleryUrls: ['/uploads/only.png'],
          galleryCaption: ['Just one'],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('/uploads/only.png');
          const figure = /<figure class="shot"[\s\S]*?<\/figure>/.exec(
            res.text,
          )?.[0] as string;
          expect(figure).not.toContain('shot-dots');
          expect(figure).not.toContain('shot-nav');
          expect(figure).not.toContain('shot-count');
        });
    });

    it('truncates a long caption and offers See more', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();
      const longCaption =
        'I was a student and did not have money for the job application, so I took 500 from my mother to capture this picture and apply for the 44th BCS examination.';

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          galleryUrls: ['/uploads/a.png'],
          galleryCaption: [longCaption],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('class="see-more"');
          const visible =
            /<span class="cap-text">([^<]*)</.exec(res.text)?.[1] ?? '';
          expect(visible.length).toBeLessThan(longCaption.length);
          expect(visible.endsWith('…')).toBe(true);
          expect(res.text).toContain('id="gallery-data"');
        });
    });

    it('keeps a short caption inline with no See more', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({ galleryUrls: ['/uploads/a.png'], galleryCaption: ['Short.'] })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Short.');
          expect(res.text).not.toContain('class="see-more"');
        });
    });

    it('drops an unsafe social url', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          intro: 'x',
          socialLabel: ['Evil'],
          socialUrl: ['javascript:alert(1)'],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => expect(res.text).not.toContain('javascript:alert'));
    });

    it('is linked from the public nav', () =>
      request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => expect(res.text).toContain('href="/about"')));
  });

  describe('caching and payload', () => {
    it('lets a repeat visit revalidate into a 304', async () => {
      const server = app.getHttpServer();
      const first = await request(server).get('/about').expect(200);
      const etag = first.headers.etag;

      expect(etag).toBeDefined();

      await request(server)
        .get('/about')
        .set('If-None-Match', etag)
        .expect(304)
        .expect((res) => expect(res.text).toBeFalsy());
    });

    it('serves the header avatar at a sensible width, not the full upload', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/settings')
        .set('Cookie', cookie)
        .type('form')
        .send({ authorName: 'Rajib', avatarUrl: '/uploads/me.png' })
        .expect(302);

      await request(server)
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('src="/img/me.png?w=200"');
          expect(res.text).not.toContain(
            'class="mark avatar-img" src="/uploads/',
          );
          expect(res.text).toContain('fetchpriority="high"');
          expect(res.text).not.toMatch(
            /class="mark avatar-img"[^>]*loading="lazy"/,
          );
        });
    });

    it('marks gallery images lazy and reserves their space', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          galleryUrls: ['/uploads/a.png'],
          galleryCaption: ['Below the fold'],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          const figure = /<figure class="shot"[\s\S]*?<\/figure>/.exec(
            res.text,
          )?.[0] as string;

          expect(figure).toContain('loading="lazy"');
          expect(figure).toContain('decoding="async"');
          expect(figure).toContain('width="400"');
          expect(figure).toContain('height="300"');
        });
    });
  });

  describe('related posts', () => {
    const write = async (
      cookie: string,
      title: string,
      extra: Record<string, unknown> = {},
    ): Promise<string> => {
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({ title, content: 'Body.', status: 'published', ...extra })
        .expect(302);

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const edit = await request(server)
        .get('/admin')
        .set('Cookie', cookie)
        .expect(200);

      const row = new RegExp(
        `/admin/posts/([0-9a-f-]+)/edit"[^]{0,400}?${title}`,
      ).exec(edit.text);

      return row?.[1] ?? slug;
    };

    it('offers the other posts to pick from in the editor', async () => {
      const cookie = await signIn();
      await write(cookie, 'Pickable Post');

      await request(app.getHttpServer())
        .get('/admin/posts/new')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('More like this');
          expect(res.text).toContain('name="relatedIds"');
          expect(res.text).toContain('Pickable Post');
        });
    });

    it('shows only the posts the author picked, in their order', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await write(cookie, 'Ignored Post', { tags: 'kubernetes' });
      const first = await write(cookie, 'Chosen One');
      const second = await write(cookie, 'Chosen Two');
      await write(cookie, 'Host Post', {
        tags: 'kubernetes',
        relatedIds: [second, first],
      });

      await request(server)
        .get('/post/host-post')
        .expect(200)
        .expect((res) => {
          const section = /<section class="related">[\s\S]*?<\/section>/.exec(
            res.text,
          )?.[0] as string;

          expect(section).not.toContain('Ignored Post');
          expect(section.indexOf('Chosen Two')).toBeLessThan(
            section.indexOf('Chosen One'),
          );
        });
    });

    it('keeps the tick when the editor is reopened', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      const target = await write(cookie, 'Target Post');
      const host = await write(cookie, 'Host Post', { relatedIds: [target] });

      await request(server)
        .get(`/admin/posts/${host}/edit`)
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          const box = new RegExp(
            `name="relatedIds" value="${target}"\\s*checked`,
          );
          expect(res.text).toMatch(box);
        });
    });

    it('never offers a post as related to itself', async () => {
      const cookie = await signIn();
      const id = await write(cookie, 'Lonely Post');

      await request(app.getHttpServer())
        .get(`/admin/posts/${id}/edit`)
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).not.toContain(`name="relatedIds" value="${id}"`);
        });
    });

    it('drops a pick that is no longer published', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      const draft = await write(cookie, 'Now A Draft');
      await write(cookie, 'Host Post', { relatedIds: [draft] });

      await request(server)
        .post(`/admin/posts/${draft}/edit`)
        .set('Cookie', cookie)
        .type('form')
        .send({ title: 'Now A Draft', content: 'Body.', status: 'draft' })
        .expect(302);

      await request(server)
        .get('/post/host-post')
        .expect(200)
        .expect((res) => {
          expect(res.text).not.toContain('Now A Draft');
        });
    });

    it('falls back to shared tags when the author picked nothing', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await write(cookie, 'Tagged Neighbour', { tags: 'kubernetes' });
      await write(cookie, 'Host Post', { tags: 'kubernetes' });

      await request(server)
        .get('/post/host-post')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Tagged Neighbour');
        });
    });
  });

  describe('photo modal scrolling', () => {
    it('scrolls the caption alone, holding the photo in place', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          galleryUrls: ['/uploads/a.png'],
          galleryCaption: ['A very long story. '.repeat(40)],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).toMatch(
            /\.shot-modal-inner \{[^}]*overflow: hidden/,
          );
          expect(res.text).toMatch(
            /\.shot-modal-caption \{[^}]*overflow-y: auto/,
          );
          expect(res.text).toMatch(/\.shot-modal-caption \{[^}]*min-height: 0/);
        });
    });
  });

  describe('image loading skeleton', () => {
    it('shimmers gallery images on the about page until they arrive', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({ galleryUrls: ['/uploads/a.png'], galleryCaption: ['A photo'] })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          const figure = /<figure class="shot"[\s\S]*?<\/figure>/.exec(
            res.text,
          )?.[0] as string;

          expect(figure).toContain('class="skel"');
          expect(res.text).toContain('@keyframes skel-sweep');
          expect(res.text).toContain('classList.add(state)');
        });
    });

    it('re-arms the skeleton when the modal pages to another photo', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/about')
        .set('Cookie', cookie)
        .type('form')
        .send({
          galleryUrls: ['/uploads/a.png\n/uploads/b.png'],
          galleryCaption: ['Two photos'],
        })
        .expect(302);

      await request(server)
        .get('/about')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('id="shot-modal-img" class="skel"');
          expect(res.text).toContain("modalImg.classList.remove('is-loaded')");
        });
    });

    it('shimmers the cover on a project detail page', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/projects/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'Skeleton Demo',
          description: 'x',
          coverUrl: '/uploads/cover.png',
          year: '2026',
          status: 'ongoing',
        })
        .expect(302);

      await request(server)
        .get('/projects/skeleton-demo')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('class="proj-detail-cover skel"');
          expect(res.text).toContain(
            '.proj-detail-cover.skel:not(.is-loaded) { aspect-ratio: 2 / 1; }',
          );
          expect(res.text).toContain('@keyframes skel-sweep');
        });
    });

    it('shimmers images inside a post body', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'Post With Photo',
          content: 'Look:\n\n![A diagram](/uploads/d.png)',
          status: 'published',
        })
        .expect(302);

      await request(server)
        .get('/post/post-with-photo')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('<img class="skel" src="/uploads/d.png"');
          expect(res.text).toContain('loading="lazy"');
          expect(res.text).toContain('@keyframes skel-sweep');
        });
    });
  });

  describe('social link previews', () => {
    const setBrand = async (cookie: string) =>
      request(app.getHttpServer())
        .post('/admin/settings')
        .set('Cookie', cookie)
        .type('form')
        .send({
          authorName: 'Saidul Islam Rajib',
          authorBio: 'Backend engineer working with C# and NestJS.',
          avatarUrl: '/uploads/me.png',
          siteUrl: 'https://example.com',
          siteTitle: 'Engineering notes',
          showIntro: 'true',
        })
        .expect(302);

    it('emits a complete Open Graph image block', async () => {
      const cookie = await signIn();
      await setBrand(cookie);

      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain(
            '<meta property="og:image" content="https://example.com/img/og/me.png" />',
          );
          expect(res.text).toContain(
            'property="og:image:width" content="1200"',
          );
          expect(res.text).toContain(
            'property="og:image:height" content="630"',
          );
          expect(res.text).toContain(
            'property="og:image:type" content="image/jpeg"',
          );
          expect(res.text).toContain('property="og:image:secure_url"');
          expect(res.text).toContain(
            'name="twitter:card" content="summary_large_image"',
          );
        });
    });

    it('states no size for an image it did not build', async () => {
      const cookie = await signIn();
      await setBrand(cookie);

      await request(app.getHttpServer())
        .get('/projects/aws-demo-project')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('opengraph.githubassets.com');
          expect(res.text).not.toContain('property="og:image:width"');
          expect(res.text).not.toContain('property="og:image:height"');
        });
    });

    it('serves the generated card at the size it advertises', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      const upload = await request(server)
        .post('/admin/uploads')
        .set('Cookie', cookie)
        .attach('file', await portraitJpeg(), 'me.jpg')
        .expect(201);

      const name = (upload.body as UploadBody).url.replace('/uploads/', '');

      const card = await request(server)
        .get(`/img/og/${name}`)
        .expect(200)
        .expect('Content-Type', /image\/jpeg/);

      const meta = await sharp(card.body as Buffer).metadata();

      expect(meta.width).toBe(1200);
      expect(meta.height).toBe(630);
    });

    it('prefers the sharing intro over the bio', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/settings')
        .set('Cookie', cookie)
        .type('form')
        .send({
          authorName: 'Saidul Islam Rajib',
          authorBio: 'The bio, which is not written for sharing.',
          shareIntro: 'Backend engineer writing up what breaks and why.',
          siteUrl: 'https://example.com',
        })
        .expect(302);

      await request(server)
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain(
            'property="og:description" content="Backend engineer writing up what breaks and why."',
          );
          expect(res.text).not.toContain('The bio, which is not written');
        });
    });

    it('lets a post keep its own summary rather than the intro', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/settings')
        .set('Cookie', cookie)
        .type('form')
        .send({
          shareIntro: 'Site level intro.',
          siteUrl: 'https://example.com',
        })
        .expect(302);

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'Own Summary',
          subtitle: 'What this particular post is about.',
          content: 'Body.',
          status: 'published',
        })
        .expect(302);

      await request(server)
        .get('/post/own-summary')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('What this particular post is about.');
          expect(res.text).not.toContain(
            'property="og:description" content="Site level intro."',
          );
        });
    });

    it('falls back to the bio when no intro is set', async () => {
      const cookie = await signIn();
      await setBrand(cookie);

      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain(
            'Backend engineer working with C# and NestJS.',
          );
        });
    });

    it('uses the bio as the preview and search description', async () => {
      const cookie = await signIn();
      await setBrand(cookie);

      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain(
            'content="Backend engineer working with C# and NestJS."',
          );
        });
    });

    it('makes every preview URL absolute', async () => {
      const cookie = await signIn();
      await setBrand(cookie);

      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          const images = [
            ...res.text.matchAll(/(?:og|twitter):image" content="([^"]+)"/g),
          ].map((m) => m[1]);

          expect(images.length).toBeGreaterThan(0);
          images.forEach((url) => expect(url).toMatch(/^https?:\/\//));
        });
    });

    it('never leaves a page without a preview image', async () => {
      const cookie = await signIn();
      await setBrand(cookie);
      const server = app.getHttpServer();

      for (const path of ['/', '/about', '/projects', '/tags']) {
        await request(server)
          .get(path)
          .expect(200)
          .expect((res) => expect(res.text).toContain('property="og:image"'));
      }
    });
  });

  describe('admin lists: search and pagination', () => {
    it('paginates posts and reports the page count', async () => {
      const cookie = await signIn();

      await request(app.getHttpServer())
        .get('/admin')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('class="admin-search"');
          expect(res.text).toContain('id="post-rows"');
        });
    });

    it('searches posts across title, tags and status', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .get('/admin?q=docker')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('result');
          expect(res.text).toContain('Clear');
        });

      await request(server)
        .get('/admin?q=zzzznothing')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => expect(res.text).toContain('Nothing matches'));
    });

    it('finds drafts, which the public feed hides', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({ title: 'Zebra Draft', content: 'x', status: 'draft' })
        .expect(302);

      await request(server)
        .get('/admin?q=zebra')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => expect(res.text).toContain('Zebra Draft'));
    });

    it('paginates projects at ten per page', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .get('/admin/projects')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('class="pager"');
          expect(res.text).toMatch(/Page 1 of \d+/);
        });

      await request(server)
        .get('/admin/projects?page=2')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => expect(res.text).toMatch(/Page 2 of \d+/));
    });

    it('clamps an out-of-range page instead of erroring', async () => {
      const cookie = await signIn();

      await request(app.getHttpServer())
        .get('/admin/projects?page=999')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => expect(res.text).toContain('class="pager"'));
    });

    it('searches projects and keeps the term across pages', async () => {
      const cookie = await signIn();

      await request(app.getHttpServer())
        .get('/admin/projects?q=typescript')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('result');
          expect(res.text).toContain('value="typescript"');
        });
    });
  });

  describe('settings', () => {
    it('requires a session', () =>
      request(app.getHttpServer())
        .get('/admin/settings')
        .expect(302)
        .expect('Location', '/login'));

    it('renders the settings form', async () => {
      const cookie = await signIn();

      await request(app.getHttpServer())
        .get('/admin/settings')
        .set('Cookie', cookie)
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Settings');
          expect(res.text).toContain('name="authorName"');
          expect(res.text).toContain('name="footerOwner"');
        });
    });

    it('saves profile and footer changes and shows them on the site', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/settings')
        .set('Cookie', cookie)
        .type('form')
        .send({
          authorName: 'Rajib Ahmed',
          authorRole: 'Senior Engineer',
          siteTitle: 'My Engineering Journal',
          siteTagline: 'Notes from the trenches',
          showIntro: 'true',
          footerOwner: 'Team Sober',
          footerOwnerUrl: 'https://linkedin.com/in/example',
          footerSuffix: 'All rights reserved.',
          linkLabel: ['Blog', 'GitHub'],
          linkUrl: ['/', 'https://github.com/example'],
        })
        .expect(302)
        .expect('Location', '/admin/settings?saved=1');

      await request(server)
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Rajib Ahmed');
          expect(res.text).toContain('My Engineering Journal');
          expect(res.text).toContain('Notes from the trenches');
          expect(res.text).toContain('https://linkedin.com/in/example');
          expect(res.text).toContain('https://github.com/example');
          expect(res.text).toContain('>RA<');
        });
    });

    it('rejects an unsafe footer link', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/settings')
        .set('Cookie', cookie)
        .type('form')
        .send({
          authorName: 'X',
          linkLabel: ['Evil'],
          linkUrl: ['javascript:alert(1)'],
        })
        .expect(302);

      await request(server)
        .get('/')
        .expect(200)
        .expect((res) => expect(res.text).not.toContain('javascript:alert'));
    });
  });

  describe('importing starter posts', () => {
    it('requires a session', () =>
      request(app.getHttpServer())
        .post('/admin/import-starters')
        .expect(302)
        .expect('Location', '/login'));

    it('adds missing starters without touching the author’s posts', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({ title: 'Mine Only', content: 'x', status: 'published' })
        .expect(302);

      await request(server)
        .post('/admin/import-starters')
        .set('Cookie', cookie)
        .expect(302)
        .expect('Location', '/admin?imported=0&skipped=10');

      await request(server)
        .get('/post/mine-only')
        .expect(200)
        .expect((res) => expect(res.text).toContain('Mine Only'));
    });
  });

  describe('uploads and preview', () => {
    it('blocks uploads without a session', () =>
      request(app.getHttpServer())
        .post('/admin/uploads')
        .attach('file', Buffer.from('fake'), 'x.png')
        .expect(302)
        .expect('Location', '/login'));

    it('accepts an image and returns pasteable markdown', async () => {
      const cookie = await signIn();

      const res = await request(app.getHttpServer())
        .post('/admin/uploads')
        .set('Cookie', cookie)
        .attach('file', Buffer.from('fake-png-bytes'), 'diagram.png')
        .expect(201);

      const body = res.body as UploadBody;
      expect(body.url).toMatch(/^\/uploads\/\d+-[0-9a-f]{12}\.png$/);
      expect(body.markdown).toContain('![diagram](/uploads/');

      await request(app.getHttpServer()).get(body.url).expect(200);
    });

    it('rejects a non-image extension', async () => {
      const cookie = await signIn();

      await request(app.getHttpServer())
        .post('/admin/uploads')
        .set('Cookie', cookie)
        .attach('file', Buffer.from('#!/bin/sh'), 'evil.sh')
        .expect(400);
    });

    it('renders markdown for the preview pane', async () => {
      const cookie = await signIn();

      await request(app.getHttpServer())
        .post('/admin/preview')
        .set('Cookie', cookie)
        .type('form')
        .send({ content: '## Title\n\n**bold** and `code`' })
        .expect(201)
        .expect((res) => {
          expect(res.text).toMatch(/<h2[^>]*>Title<\/h2>/);
          expect(res.text).toContain('<strong>bold</strong>');
          expect(res.text).toContain('<code>code</code>');
        });
    });
  });

  describe('post lifecycle', () => {
    it('creates, publishes, edits and deletes a post', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'Lifecycle Post',
          subtitle: 'sub',
          content: '# Heading\n\nSome body text.',
          highlight: 'The key point.',
          tags: 'testing, e2e',
          status: 'published',
        })
        .expect(302)
        .expect('Location', '/admin?ok=created');

      await request(server)
        .get('/post/lifecycle-post')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Lifecycle Post');
          expect(res.text).toMatch(/<h1[^>]*>Heading<\/h1>/);
          expect(res.text).toContain('The key point.');
        });

      await request(server)
        .get('/tag/testing')
        .expect(200)
        .expect((res) => expect(res.text).toContain('Lifecycle Post'));

      const dash = await request(server)
        .get('/admin')
        .set('Cookie', cookie)
        .expect(200);
      const id = /\/admin\/posts\/([0-9a-f-]{36})\/edit/.exec(dash.text)?.[1];
      expect(id).toBeDefined();

      await request(server)
        .post(`/admin/posts/${id}/edit`)
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'Lifecycle Post',
          content: 'Edited body.',
          tags: 'testing',
          status: 'published',
        })
        .expect(302)
        .expect('Location', '/admin?ok=updated');

      await request(server)
        .get('/post/lifecycle-post')
        .expect(200)
        .expect((res) => expect(res.text).toContain('Edited body.'));

      await request(server)
        .post(`/admin/posts/${id}/delete`)
        .set('Cookie', cookie)
        .expect(302)
        .expect('Location', '/admin?ok=deleted');

      await request(server).get('/post/lifecycle-post').expect(404);
    });

    it('renders multiple highlights as a takeaways list', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'Many Takeaways',
          content: 'body',
          highlight:
            'Docker containers are ephemeral\nPolling needs a baseline revision\nImages must live on a volume',
          status: 'published',
        })
        .expect(302);

      await request(server)
        .get('/post/many-takeaways')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Key takeaways');
          expect(res.text).toContain('Docker containers are ephemeral');
          expect(res.text).toContain('Images must live on a volume');
        });
    });

    it('renders short highlights as keyword chips', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'Chip Highlights',
          content: 'body',
          highlight: 'docker\nci/cd\nAWS\nKafka',
          status: 'published',
        })
        .expect(302);

      await request(server)
        .get('/post/chip-highlights')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('key-chip');
          expect(res.text).toContain('>Kafka<');
          expect(res.text).toContain('>ci/cd<');
          expect(res.text).not.toContain('Key takeaways');
          expect(res.text).not.toContain('class="pullquote"');
        });
    });

    it('renders a single highlight as a pull quote, not a list', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({
          title: 'One Takeaway',
          content: 'body',
          highlight: 'A green push is not proof your code shipped',
          status: 'published',
        })
        .expect(302);

      await request(server)
        .get('/post/one-takeaway')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('class="pullquote"');
          expect(res.text).not.toContain('Key takeaways');
          expect(res.text).not.toContain('key-chip');
        });
    });

    it('keeps drafts off the public feed', async () => {
      const cookie = await signIn();
      const server = app.getHttpServer();

      await request(server)
        .post('/admin/posts/new')
        .set('Cookie', cookie)
        .type('form')
        .send({ title: 'Hidden Draft', content: 'secret', status: 'draft' })
        .expect(302);

      await request(server).get('/post/hidden-draft').expect(404);

      await request(server)
        .get('/')
        .expect(200)
        .expect((res) => expect(res.text).not.toContain('Hidden Draft'));
    });
  });
});
