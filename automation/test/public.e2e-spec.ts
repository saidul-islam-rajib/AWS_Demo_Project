import request from 'supertest';
import { useTestApp, HealthBody } from './helpers/harness';

const ctx = useTestApp();

describe('public pages', () => {
  it('GET / renders the feed', () =>
    request(ctx.server)
      .get('/')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .expect((res) => {
        expect(res.text).toContain('Engineering notes');
      }));

  it('GET /tags renders an explore page, not just a tag list', () =>
    request(ctx.server)
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
    request(ctx.server)
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('class="stat stat-link" href="/tags"');
        expect(res.text).toContain('Topics covered');
      }));

  it('links tags to their own pages from the explore page', () =>
    request(ctx.server)
      .get('/tags')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('href="/tag/jenkins"');
        expect(res.text).toContain('href="/tag/docker"');
      }));

  it('GET /search filters posts', () =>
    request(ctx.server).get('/search?q=jenkins').expect(200));

  it('GET /post/:slug returns 404 for an unknown slug', () =>
    request(ctx.server).get('/post/does-not-exist').expect(404));

  it('GET /health reports ok', () =>
    request(ctx.server)
      .get('/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as HealthBody;
        expect(body.status).toBe('ok');
        expect(typeof body.posts).toBe('number');
      }));
});

describe('navigation', () => {
  it('renders every nav item as a plain link, with no button styling', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const res = await request(ctx.server).get('/').expect(200);

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
    const res = await request(ctx.server).get('/').expect(200);
    const header = /<div class="header-inner">([\s\S]*?)<\/header>/.exec(
      res.text,
    )?.[1] as string;

    expect(header.indexOf('nav-burger')).toBeLessThan(
      header.indexOf('class="wordmark"'),
    );
  });

  it('marks the current section, and never marks Write as current', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

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

describe('caching and payload', () => {
  it('lets a repeat visit revalidate into a 304', async () => {
    const server = ctx.server;
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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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

describe('photo modal scrolling', () => {
  it('scrolls the caption alone, holding the photo in place', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
        expect(res.text).toMatch(/\.shot-modal-inner \{[^}]*overflow: hidden/);
        expect(res.text).toMatch(
          /\.shot-modal-caption \{[^}]*overflow-y: auto/,
        );
        expect(res.text).toMatch(/\.shot-modal-caption \{[^}]*min-height: 0/);
      });
  });
});

describe('image loading skeleton', () => {
  it('shimmers gallery images on the about page until they arrive', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
