import request from 'supertest';
import { useTestApp } from './helpers/harness';

const ctx = useTestApp();

describe('tutorials', () => {
  const newSubject = async (cookie: string, title: string, extra = {}) =>
    request(ctx.server)
      .post('/admin/tutorials/subjects/new')
      .set('Cookie', cookie)
      .type('form')
      .send({ title, summary: 'Summary text', icon: '🌐', ...extra })
      .expect(302);

  const subjectIdBySlug = async (cookie: string, slug: string) => {
    const res = await request(ctx.server)
      .get('/admin/tutorials')
      .set('Cookie', cookie)
      .expect(200);

    const match = new RegExp(
      `/tutorials/${slug}\\b[^]{0,400}?/admin/tutorials/subjects/([0-9a-f-]+)/move`,
    ).exec(res.text);

    return match?.[1] ?? '';
  };

  it('renders the subject index with the seeded subject', () =>
    request(ctx.server)
      .get('/tutorials')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .expect((res) => {
        expect(res.text).toContain('Tutorials');
        expect(res.text).toContain('Networking');
        expect(res.text).toContain('/tutorials/networking');
      }));

  it('renders a subject curriculum in lesson order', () =>
    request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        const first = res.text.indexOf('What an IP address actually is');
        const second = res.text.indexOf('DNS: turning names into addresses');

        expect(first).toBeGreaterThan(-1);
        expect(second).toBeGreaterThan(first);
      }));

  it('renders a lesson with position and navigation', () =>
    request(ctx.server)
      .get('/tutorials/networking/dns-turning-names-into-addresses')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Lesson 2 of 3');
        expect(res.text).toContain('What an IP address actually is');
        expect(res.text).toContain('TCP, UDP and what a port is for');
        expect(res.text).toContain('data-mark-done');
      }));

  it('omits the previous link on the first lesson', () =>
    request(ctx.server)
      .get('/tutorials/networking/what-an-ip-address-actually-is')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Lesson 1 of 3');
        expect(res.text).not.toContain('>Previous<');
      }));

  it('omits the next link on the last lesson', () =>
    request(ctx.server)
      .get('/tutorials/networking/tcp-udp-and-what-a-port-is-for')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Lesson 3 of 3');
        expect(res.text).not.toContain('>Next<');
      }));

  it('404s an unknown subject and an unknown lesson', async () => {
    const server = ctx.server;

    await request(server).get('/tutorials/nope').expect(404);
    await request(server).get('/tutorials/networking/nope').expect(404);
  });

  it('requires a session for the admin area', async () => {
    const server = ctx.server;

    await request(server).get('/admin/tutorials').expect(302);
    await request(server)
      .post('/admin/tutorials/subjects/new')
      .type('form')
      .send({ title: 'Sneaky' })
      .expect(302);

    await request(server)
      .get('/tutorials')
      .expect(200)
      .expect((res) => expect(res.text).not.toContain('Sneaky'));
  });

  it('creates a subject and a lesson through the admin', async () => {
    const cookie = await ctx.signIn();

    await newSubject(cookie, 'Linux');
    const id = await subjectIdBySlug(cookie, 'linux');
    expect(id).toBeTruthy();

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/lessons/new`)
      .set('Cookie', cookie)
      .type('form')
      .send({
        subjectId: id,
        title: 'File permissions',
        summary: 'chmod and chown',
        content: '## Modes\n\nBody.',
        difficulty: 'intermediate',
        status: 'published',
        tags: 'linux, permissions',
      })
      .expect(302);

    await request(ctx.server)
      .get('/tutorials/linux/file-permissions')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('File permissions');
        expect(res.text).toContain('Intermediate');
        expect(res.text).toContain('Modes');
      });
  });

  it('keeps a draft subject and its lessons off the public site', async () => {
    const cookie = await ctx.signIn();

    await newSubject(cookie, 'Hidden Subject', { status: 'draft' });

    await request(ctx.server)
      .get('/tutorials')
      .expect(200)
      .expect((res) => expect(res.text).not.toContain('Hidden Subject'));

    await request(ctx.server).get('/tutorials/hidden-subject').expect(404);
  });

  it('keeps a draft lesson off the subject page', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectIdBySlug(cookie, 'networking');

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/lessons/new`)
      .set('Cookie', cookie)
      .type('form')
      .send({
        subjectId: id,
        title: 'Unfinished Draft',
        content: 'x',
        status: 'draft',
      })
      .expect(302);

    await request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => expect(res.text).not.toContain('Unfinished Draft'));

    await request(ctx.server)
      .get('/tutorials/networking/unfinished-draft')
      .expect(404);
  });

  it('reorders lessons from the admin', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;
    const id = await subjectIdBySlug(cookie, 'networking');

    const page = await request(server)
      .get(`/admin/tutorials/subjects/${id}`)
      .set('Cookie', cookie)
      .expect(200);

    const ids = [
      ...page.text.matchAll(/\/admin\/tutorials\/lessons\/([0-9a-f-]+)\/move/g),
    ].map((m) => m[1]);

    const second = ids[2];
    expect(second).toBeTruthy();

    await request(server)
      .post(`/admin/tutorials/lessons/${second}/move`)
      .set('Cookie', cookie)
      .type('form')
      .send({ direction: 'up' })
      .expect(302);

    await request(server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        const first = res.text.indexOf('DNS: turning names into addresses');
        const other = res.text.indexOf('What an IP address actually is');

        expect(first).toBeLessThan(other);
      });
  });

  it('deletes a subject together with its lessons', async () => {
    const cookie = await ctx.signIn();

    await newSubject(cookie, 'Temporary');
    const id = await subjectIdBySlug(cookie, 'temporary');

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/lessons/new`)
      .set('Cookie', cookie)
      .type('form')
      .send({ subjectId: id, title: 'Doomed', content: 'x' })
      .expect(302);

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/delete`)
      .set('Cookie', cookie)
      .expect(302);

    await request(ctx.server).get('/tutorials/temporary').expect(404);
    await request(ctx.server).get('/tutorials/temporary/doomed').expect(404);
  });

  it('links tutorials from the site navigation', () =>
    request(ctx.server)
      .get('/')
      .expect(200)
      .expect((res) => expect(res.text).toContain('href="/tutorials"')));

  it('keeps admin pages out of search results', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .get('/admin/projects')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => expect(res.text).toContain('noindex'));
  });
});

describe('drag reordering', () => {
  const lessonIds = async (cookie: string, subjectId: string) => {
    const res = await request(ctx.server)
      .get(`/admin/tutorials/subjects/${subjectId}`)
      .set('Cookie', cookie)
      .expect(200);

    return [...res.text.matchAll(/data-sort-id="([0-9a-f-]+)"/g)].map(
      (m) => m[1],
    );
  };

  const subjectId = async (cookie: string, slug: string) => {
    const res = await request(ctx.server)
      .get('/admin/tutorials')
      .set('Cookie', cookie)
      .expect(200);

    const rows = [
      ...res.text.matchAll(
        /data-sort-id="([0-9a-f-]+)"[^]*?\/tutorials\/([a-z0-9-]+)\s/g,
      ),
    ];

    return rows.find((row) => row[2] === slug)?.[1] ?? '';
  };

  it('marks each row as draggable with a stable id', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');

    const res = await request(ctx.server)
      .get(`/admin/tutorials/subjects/${id}`)
      .set('Cookie', cookie)
      .expect(200);

    expect(res.text).toContain('draggable="true"');
    expect(res.text).toContain('data-sortable');
    expect(res.text).toContain('data-sortable-order');
    expect((await lessonIds(cookie, id)).length).toBe(3);
  });

  it('persists a dragged order', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');
    const before = await lessonIds(cookie, id);

    const reversed = [...before].reverse();

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/reorder`)
      .set('Cookie', cookie)
      .type('form')
      .send({ order: reversed.join(',') })
      .expect(302);

    expect(await lessonIds(cookie, id)).toEqual(reversed);
  });

  it('shows the new order to readers', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');
    const reversed = [...(await lessonIds(cookie, id))].reverse();

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/reorder`)
      .set('Cookie', cookie)
      .type('form')
      .send({ order: reversed.join(',') })
      .expect(302);

    await request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        const first = res.text.indexOf('TCP, UDP and what a port is for');
        const last = res.text.indexOf('What an IP address actually is');

        expect(first).toBeLessThan(last);
      });
  });

  it('survives a garbled order without losing lessons', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/reorder`)
      .set('Cookie', cookie)
      .type('form')
      .send({ order: 'not-a-real-id,,   ,' })
      .expect(302);

    expect((await lessonIds(cookie, id)).length).toBe(3);
  });

  it('requires a session', () =>
    request(ctx.server)
      .post('/admin/tutorials/reorder')
      .type('form')
      .send({ order: 'a,b' })
      .expect(302));
});
