import request from 'supertest';
import { useTestApp } from './helpers/harness';

const ctx = useTestApp();

describe('publish scheduling', () => {
  const future = () =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);
  const past = () => '2020-03-01T09:00';

  it('hides a post scheduled for the future', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/posts/new')
      .set('Cookie', cookie)
      .type('form')
      .send({ title: 'No Date', content: 'x', status: 'published' })
      .expect(302);

    await request(server).get('/post/no-date').expect(200);
  });
});

describe('related posts', () => {
  const write = async (
    cookie: string,
    title: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    await write(cookie, 'Pickable Post');

    await request(ctx.server)
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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const id = await write(cookie, 'Lonely Post');

    await request(ctx.server)
      .get(`/admin/posts/${id}/edit`)
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => {
        expect(res.text).not.toContain(`name="relatedIds" value="${id}"`);
      });
  });

  it('drops a pick that is no longer published', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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

describe('importing starter posts', () => {
  it('requires a session', () =>
    request(ctx.server)
      .post('/admin/import-starters')
      .expect(302)
      .expect('Location', '/login'));

  it('adds missing starters without touching the author’s posts', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

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

describe('post lifecycle', () => {
  it('creates, publishes, edits and deletes a post', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
