import request from 'supertest';
import { useTestApp, UploadBody } from './helpers/harness';

const ctx = useTestApp();

describe('uploads and preview', () => {
  it('blocks uploads without a session', () =>
    request(ctx.server)
      .post('/admin/uploads')
      .attach('file', Buffer.from('fake'), 'x.png')
      .expect(302)
      .expect('Location', '/login'));

  it('accepts an image and returns pasteable markdown', async () => {
    const cookie = await ctx.signIn();

    const res = await request(ctx.server)
      .post('/admin/uploads')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('fake-png-bytes'), 'diagram.png')
      .expect(201);

    const body = res.body as UploadBody;
    expect(body.url).toMatch(/^\/uploads\/\d+-[0-9a-f]{12}\.png$/);
    expect(body.markdown).toContain('![diagram](/uploads/');

    await request(ctx.server).get(body.url).expect(200);
  });

  it('rejects a non-image extension', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .post('/admin/uploads')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('#!/bin/sh'), 'evil.sh')
      .expect(400);
  });

  it('renders markdown for the preview pane', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
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
