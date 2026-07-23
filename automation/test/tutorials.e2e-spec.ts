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

  it('reorders lessons within a chapter from the admin', async () => {
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

    const unique = [...new Set(ids)];
    const last = unique[unique.length - 1];
    expect(last).toBeTruthy();

    await request(server)
      .post(`/admin/tutorials/lessons/${last}/move`)
      .set('Cookie', cookie)
      .type('form')
      .send({ direction: 'up' })
      .expect(302);

    await request(server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        const tcp = res.text.indexOf('TCP, UDP and what a port is for');
        const dns = res.text.indexOf('DNS: turning names into addresses');

        expect(tcp).toBeLessThan(dns);
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

  it('persists a dragged order within a chapter', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');
    const before = await lessonIds(cookie, id);

    const swapped = [before[0], before[2], before[1]];

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/reorder`)
      .set('Cookie', cookie)
      .type('form')
      .send({ order: swapped.join(',') })
      .expect(302);

    expect(await lessonIds(cookie, id)).toEqual(swapped);
  });

  it('does not move a lesson out of its chapter by dragging', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');
    const before = await lessonIds(cookie, id);

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/reorder`)
      .set('Cookie', cookie)
      .type('form')
      .send({ order: [...before].reverse().join(',') })
      .expect(302);

    const after = await lessonIds(cookie, id);

    expect(after[0]).toBe(before[0]);
    expect(after).toHaveLength(3);
  });

  it('shows the new order to readers', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');
    const before = await lessonIds(cookie, id);

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/reorder`)
      .set('Cookie', cookie)
      .type('form')
      .send({ order: [before[0], before[2], before[1]].join(',') })
      .expect(302);

    await request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        const tcp = res.text.indexOf('TCP, UDP and what a port is for');
        const dns = res.text.indexOf('DNS: turning names into addresses');

        expect(tcp).toBeLessThan(dns);
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

describe('chapters', () => {
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

  it('shows the seeded chapters on the public subject page', () =>
    request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Addressing');
        expect(res.text).toContain('Names and transport');
        expect(res.text).toContain('class="chapter-head"');
      }));

  it('groups the lesson sidebar by chapter', () =>
    request(ctx.server)
      .get('/tutorials/networking/dns-turning-names-into-addresses')
      .expect(200)
      .expect((res) => expect(res.text).toContain('side-chapter')));

  it('creates a chapter from the admin', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/chapters/new`)
      .set('Cookie', cookie)
      .type('form')
      .send({ title: 'Troubleshooting', summary: 'When it breaks.' })
      .expect(302);

    await request(ctx.server)
      .get(`/admin/tutorials/subjects/${id}`)
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Troubleshooting');
        expect(res.text).toContain('When it breaks.');
      });
  });

  it('assigns a lesson to a chapter and shows it there', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/chapters/new`)
      .set('Cookie', cookie)
      .type('form')
      .send({ title: 'Extras' })
      .expect(302);

    const page = await request(ctx.server)
      .get(`/admin/tutorials/subjects/${id}/lessons/new`)
      .set('Cookie', cookie)
      .expect(200);

    const chapterId =
      /<option value="([0-9a-f-]+)"[^>]*>Extras</.exec(page.text)?.[1] ?? '';
    expect(chapterId).toBeTruthy();

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/lessons/new`)
      .set('Cookie', cookie)
      .type('form')
      .send({
        subjectId: id,
        chapterId,
        title: 'Packet capture',
        content: 'tcpdump',
      })
      .expect(302);

    await request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        const chapter = res.text.indexOf('Extras');
        const lesson = res.text.indexOf('Packet capture');

        expect(chapter).toBeGreaterThan(-1);
        expect(lesson).toBeGreaterThan(chapter);
      });
  });

  it('keeps lessons when their chapter is deleted', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');

    const page = await request(ctx.server)
      .get(`/admin/tutorials/subjects/${id}`)
      .set('Cookie', cookie)
      .expect(200);

    const chapterId =
      /\/admin\/tutorials\/chapters\/([0-9a-f-]+)\/delete/.exec(
        page.text,
      )?.[1] ??
      /\/admin\/tutorials\/chapters\/([0-9a-f-]+)\/edit/.exec(page.text)?.[1] ??
      '';

    expect(chapterId).toBeTruthy();

    await request(ctx.server)
      .post(`/admin/tutorials/chapters/${chapterId}/delete`)
      .set('Cookie', cookie)
      .expect(302);

    await request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('What an IP address actually is');
        expect(res.text).toContain('DNS: turning names into addresses');
        expect(res.text).toContain('TCP, UDP and what a port is for');
      });
  });
});

describe('per-lesson completion time', () => {
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

  it('publishes the lesson dwell to the page', () =>
    request(ctx.server)
      .get('/tutorials/networking/what-an-ip-address-actually-is')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('data-dwell="30"');
        expect(res.text).not.toContain('Marked complete after');
      }));

  it('lets the admin set a longer time, and shows it in minutes', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/lessons/new`)
      .set('Cookie', cookie)
      .type('form')
      .send({
        subjectId: id,
        title: 'A long read',
        content: 'body',
        completionSeconds: '600',
      })
      .expect(302);

    await request(ctx.server)
      .get('/tutorials/networking/a-long-read')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('data-dwell="600"');
      });
  });

  it('refuses a zero dwell, which would complete instantly', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/lessons/new`)
      .set('Cookie', cookie)
      .type('form')
      .send({
        subjectId: id,
        title: 'Instant',
        content: 'body',
        completionSeconds: '0',
      })
      .expect(302);

    await request(ctx.server)
      .get('/tutorials/networking/instant')
      .expect(200)
      .expect((res) => expect(res.text).toContain('data-dwell="30"'));
  });
});

describe('enrolment', () => {
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

  const lockCourse = async (cookie: string) => {
    const id = await subjectId(cookie, 'networking');

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/edit`)
      .set('Cookie', cookie)
      .type('form')
      .send({
        title: 'Networking',
        summary: 'x',
        status: 'published',
        enrolment: 'key',
        enrolKey: 'autumn-2026',
      })
      .expect(302);

    return id;
  };

  it('leaves an open course readable by anyone', () =>
    request(ctx.server)
      .get('/tutorials/networking/what-an-ip-address-actually-is')
      .expect(200));

  it('shows the enrol form and hides lesson links once a key is set', async () => {
    const cookie = await ctx.signIn();
    await lockCourse(cookie);

    await request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Enrolment key needed');
        expect(res.text).toContain('What an IP address actually is');
        expect(res.text).not.toContain(
          '/tutorials/networking/what-an-ip-address-actually-is',
        );
      });
  });

  it('redirects a lesson away until the reader has enrolled', async () => {
    const cookie = await ctx.signIn();
    await lockCourse(cookie);

    await request(ctx.server)
      .get('/tutorials/networking/what-an-ip-address-actually-is')
      .expect(302)
      .expect('Location', '/tutorials/networking');
  });

  it('refuses a wrong key and says so', async () => {
    const cookie = await ctx.signIn();
    await lockCourse(cookie);

    const res = await request(ctx.server)
      .post('/tutorials/networking/enrol')
      .type('form')
      .send({ key: 'wrong' })
      .expect(302);

    expect(res.headers.location).toBe('/tutorials/networking?error=1');
    expect(res.headers['set-cookie']).toBeUndefined();

    await request(ctx.server)
      .get('/tutorials/networking?error=1')
      .expect(200)
      .expect((res2) => expect(res2.text).toContain('That key was not right'));
  });

  it('lets the right key through and remembers it', async () => {
    const cookie = await ctx.signIn();
    await lockCourse(cookie);

    const enrol = await request(ctx.server)
      .post('/tutorials/networking/enrol')
      .type('form')
      .send({ key: 'autumn-2026' })
      .expect(302);

    const setCookie = enrol.headers['set-cookie'] as unknown as string[];
    expect(setCookie).toBeDefined();

    const jar = setCookie[0];

    await request(ctx.server)
      .get('/tutorials/networking/what-an-ip-address-actually-is')
      .set('Cookie', jar)
      .expect(200)
      .expect((res) => expect(res.text).toContain('Addressing'));

    await request(ctx.server)
      .get('/tutorials/networking')
      .set('Cookie', jar)
      .expect(200)
      .expect((res) => expect(res.text).not.toContain('Enrolment key needed'));
  });

  it('marks the enrolment cookie httpOnly', async () => {
    const cookie = await ctx.signIn();
    await lockCourse(cookie);

    const enrol = await request(ctx.server)
      .post('/tutorials/networking/enrol')
      .type('form')
      .send({ key: 'autumn-2026' })
      .expect(302);

    const jar = (enrol.headers['set-cookie'] as unknown as string[])[0];

    expect(jar).toContain('HttpOnly');
  });

  it('does not lock a course set to key with an empty key', async () => {
    const cookie = await ctx.signIn();
    const id = await subjectId(cookie, 'networking');

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/edit`)
      .set('Cookie', cookie)
      .type('form')
      .send({
        title: 'Networking',
        status: 'published',
        enrolment: 'key',
        enrolKey: '',
      })
      .expect(302);

    await request(ctx.server)
      .get('/tutorials/networking/what-an-ip-address-actually-is')
      .expect(200);
  });
});

describe('student overview', () => {
  it('offers a resume link listing every lesson in reading order', () =>
    request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('data-resume=');
        expect(res.text).toContain('Start the course');

        const urls =
          /data-resume-urls="([^"]+)"/.exec(res.text)?.[1].split(',') ?? [];

        expect(urls).toHaveLength(3);
        expect(urls[0]).toContain('/tutorials/networking/');
      }));

  it('shows a per-chapter counter', () =>
    request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => expect(res.text).toContain('data-chapter-of=')));

  it('keeps the resume link out of a locked course', async () => {
    const cookie = await ctx.signIn();

    const admin = await request(ctx.server)
      .get('/admin/tutorials')
      .set('Cookie', cookie)
      .expect(200);

    const id = /data-sort-id="([0-9a-f-]+)"/.exec(admin.text)?.[1] ?? '';

    await request(ctx.server)
      .post(`/admin/tutorials/subjects/${id}/edit`)
      .set('Cookie', cookie)
      .type('form')
      .send({
        title: 'Networking',
        status: 'published',
        enrolment: 'key',
        enrolKey: 'secret',
      })
      .expect(302);

    await request(ctx.server)
      .get('/tutorials/networking')
      .expect(200)
      .expect((res) => {
        expect(res.text).not.toContain('data-resume=');
        expect(res.text).toContain('Enrolment key needed');
      });
  });
});

const studentSession = async (): Promise<string> => {
  const res = await request(ctx.server)
    .post('/account/register')
    .type('form')
    .send({
      name: 'Saidul Islam Rajib',
      email: 'rajib@example.com',
      password: 'correct-horse',
    })
    .expect(302);

  return (res.headers['set-cookie'] as unknown as string[])[0];
};

const referenceIn = (html: string): string =>
  /Reference<\/span>\s*<span>([^<]+)</.exec(html)?.[1] ?? '';

describe('certificate', () => {
  it('sends a signed-out visitor to sign in first', () =>
    request(ctx.server)
      .get('/tutorials/networking/certificate')
      .expect(302)
      .expect((res) =>
        expect(res.headers.location).toContain('/account/sign-in?next='),
      ));

  it('offers a form prefilled with the account name', async () => {
    const jar = await studentSession();

    await request(ctx.server)
      .get('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Your certificate');
        expect(res.text).toContain('Saidul Islam Rajib');
      });
  });

  it('issues one with the name given', async () => {
    const jar = await studentSession();

    await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .type('form')
      .send({ holder: 'Saidul Islam Rajib' })
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Certificate of completion');
        expect(res.text).toContain('Saidul Islam Rajib');
      });
  });

  it('issues the same one however many times it is asked', async () => {
    const jar = await studentSession();

    const first = await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .type('form')
      .send({ holder: 'Saidul Islam Rajib' })
      .expect(200);

    const second = await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .type('form')
      .send({ holder: 'A Different Name' })
      .expect(200);

    expect(referenceIn(second.text)).toBe(referenceIn(first.text));
    expect(referenceIn(first.text)).not.toBe('');
    expect(second.text).toContain('Saidul Islam Rajib');
    expect(second.text).not.toContain('A Different Name');
  });

  it('returns the stored certificate rather than the form on a revisit', async () => {
    const jar = await studentSession();

    await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .type('form')
      .send({ holder: 'Saidul Islam Rajib' })
      .expect(200);

    await request(ctx.server)
      .get('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Certificate of completion');
        expect(res.text).not.toContain('Your certificate');
      });
  });

  it('gives two people different references for the same course', async () => {
    const mine = await studentSession();

    const first = await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', mine)
      .type('form')
      .send({ holder: 'Rajib' })
      .expect(200);

    const otherRes = await request(ctx.server)
      .post('/account/register')
      .type('form')
      .send({
        name: 'Someone Else',
        email: 'other@example.com',
        password: 'correct-horse',
      })
      .expect(302);

    const theirs = (otherRes.headers['set-cookie'] as unknown as string[])[0];

    const second = await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', theirs)
      .type('form')
      .send({ holder: 'Someone Else' })
      .expect(200);

    expect(referenceIn(second.text)).not.toBe(referenceIn(first.text));
  });

  it('lists the certificate on the account page', async () => {
    const jar = await studentSession();

    await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .type('form')
      .send({ holder: 'Saidul Islam Rajib' })
      .expect(200);

    await request(ctx.server)
      .get('/account')
      .set('Cookie', jar)
      .expect(200)
      .expect((res) => expect(res.text).toContain('Networking'));
  });

  it('escapes a name rather than rendering it as markup', async () => {
    const jar = await studentSession();

    await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .type('form')
      .send({ holder: '<script>alert(1)</script>' })
      .expect(200)
      .expect((res) => {
        expect(res.text).not.toContain('<script>alert(1)</script>');
        expect(res.text).toContain('&lt;script&gt;');
      });
  });

  it('says plainly that it is not a formal qualification', async () => {
    const jar = await studentSession();

    await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .type('form')
      .send({ holder: 'Rajib' })
      .expect(200)
      .expect((res) =>
        expect(res.text).toContain('not a formal qualification'),
      );
  });

  it('keeps itself out of search engines', async () => {
    const jar = await studentSession();

    await request(ctx.server)
      .get('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .expect(200)
      .expect((res) => expect(res.text).toContain('noindex'));
  });
});

describe('certificate download', () => {
  it('serves a png as an attachment', async () => {
    const jar = await studentSession();

    await request(ctx.server)
      .get('/tutorials/networking/certificate.png')
      .set('Cookie', jar)
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .expect((res) => {
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.headers['content-disposition']).toContain(
          'certificate-networking.png',
        );
        expect((res.body as Buffer).length).toBeGreaterThan(1000);
      });
  });

  it('sends a signed-out visitor to sign in', () =>
    request(ctx.server)
      .get('/tutorials/networking/certificate.png')
      .expect(302)
      .expect((res) =>
        expect(res.headers.location).toContain('/account/sign-in'),
      ));

  it('does not mint a second certificate when downloading', async () => {
    const jar = await studentSession();

    const page = await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .type('form')
      .send({ holder: 'Rajib' })
      .expect(200);

    await request(ctx.server)
      .get('/tutorials/networking/certificate.png?holder=Someone')
      .set('Cookie', jar)
      .expect(200);

    await request(ctx.server)
      .get('/account')
      .set('Cookie', jar)
      .expect(200)
      .expect((res) => {
        const cards = res.text.match(/class="account-cert"/g) ?? [];
        expect(cards).toHaveLength(1);
      });

    expect(referenceIn(page.text)).not.toBe('');
  });

  it('offers the download from the certificate page', async () => {
    const jar = await studentSession();

    await request(ctx.server)
      .post('/tutorials/networking/certificate')
      .set('Cookie', jar)
      .type('form')
      .send({ holder: 'Saidul Islam Rajib' })
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('certificate.png?holder=');
        expect(res.text).toContain('Download image');
      });
  });

  it('404s for an unknown course', () =>
    request(ctx.server).get('/tutorials/nope/certificate.png').expect(404));
});
