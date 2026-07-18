import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import express, { urlencoded } from 'express';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppModule } from './../src/app.module';

const PASSWORD = 'test-password';

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
    // Mirrors main.ts so uploaded images are served in tests too.
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

    it('GET /tags renders the tag index', () =>
      request(app.getHttpServer()).get('/tags').expect(200));

    it('GET /search filters posts', () =>
      request(app.getHttpServer()).get('/search?q=jenkins').expect(200));

    it('GET /post/:slug returns 404 for an unknown slug', () =>
      request(app.getHttpServer()).get('/post/does-not-exist').expect(404));

    it('GET /health reports ok', () =>
      request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(typeof res.body.posts).toBe('number');
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

      expect(res.body.url).toMatch(/^\/uploads\/\d+-[0-9a-f]{12}\.png$/);
      expect(res.body.markdown).toContain('![diagram](/uploads/');

      // and it is then served back
      await request(app.getHttpServer()).get(res.body.url).expect(200);
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

      // create, published straight away
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

      // visible publicly, markdown rendered
      await request(server)
        .get('/post/lifecycle-post')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Lifecycle Post');
          // marked adds an id to headings for anchor links
          expect(res.text).toMatch(/<h1[^>]*>Heading<\/h1>/);
          expect(res.text).toContain('The key point.');
        });

      // findable by tag
      await request(server)
        .get('/tag/testing')
        .expect(200)
        .expect((res) => expect(res.text).toContain('Lifecycle Post'));

      // locate its id from the dashboard
      const dash = await request(server).get('/admin').set('Cookie', cookie).expect(200);
      const id = /\/admin\/posts\/([0-9a-f-]{36})\/edit/.exec(dash.text)?.[1];
      expect(id).toBeDefined();

      // edit
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

      // delete
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
          highlight: 'First thing\nSecond thing\nThird thing',
          status: 'published',
        })
        .expect(302);

      await request(server)
        .get('/post/many-takeaways')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Key takeaways');
          expect(res.text).toContain('First thing');
          expect(res.text).toContain('Third thing');
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
          highlight: 'Just the one',
          status: 'published',
        })
        .expect(302);

      await request(server)
        .get('/post/one-takeaway')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('pullquote');
          expect(res.text).not.toContain('Key takeaways');
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
