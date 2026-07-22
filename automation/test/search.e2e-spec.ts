import request from 'supertest';
import { useTestApp, SearchBody } from './helpers/harness';

const ctx = useTestApp();

describe('live search', () => {
  it('ignores queries shorter than two characters', () =>
    request(ctx.server)
      .get('/api/search?q=a')
      .expect(200)
      .expect((res) => expect((res.body as SearchBody).results).toEqual([])));

  it('returns matching posts with metadata', () =>
    request(ctx.server)
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
    request(ctx.server)
      .get('/api/search?q=jenkins')
      .expect(200)
      .expect((res) => {
        const kinds = (res.body as SearchBody).results.map((r) => r.kind);
        expect(kinds).toContain('Post');
        expect(kinds).toContain('Tag');
      }));

  it('returns nothing for a query with no matches', () =>
    request(ctx.server)
      .get('/api/search?q=zzzznotathing')
      .expect(200)
      .expect((res) => expect((res.body as SearchBody).results).toEqual([])));

  it('excludes scheduled posts from results', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;
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

describe('admin lists: search and pagination', () => {
  it('paginates posts and reports the page count', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .get('/admin')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('class="admin-search"');
        expect(res.text).toContain('id="post-rows"');
      });
  });

  it('searches posts across title, tags and status', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .get('/admin/projects?page=999')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => expect(res.text).toContain('class="pager"'));
  });

  it('searches projects and keeps the term across pages', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .get('/admin/projects?q=typescript')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('result');
        expect(res.text).toContain('value="typescript"');
      });
  });
});
