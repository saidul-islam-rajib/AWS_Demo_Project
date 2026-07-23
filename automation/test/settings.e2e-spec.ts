import request from 'supertest';
import { useTestApp } from './helpers/harness';

const ctx = useTestApp();

describe('settings', () => {
  it('requires a session', () =>
    request(ctx.server)
      .get('/admin/settings')
      .expect(302)
      .expect('Location', '/login'));

  it('renders the settings form', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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

describe('site URL mismatch warning', () => {
  it('warns when the configured host is not the one being used', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .post('/admin/settings')
      .set('Cookie', cookie)
      .type('form')
      .send({ authorName: 'Rajib', siteUrl: 'https://some-old-host.example' })
      .expect(302);

    await request(ctx.server)
      .get('/admin/settings')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('url-warning');
        expect(res.text).toContain('some-old-host.example');
      });
  });

  it('stays quiet once the site URL matches', async () => {
    const cookie = await ctx.signIn();

    const page = await request(ctx.server)
      .get('/admin/settings')
      .set('Cookie', cookie)
      .expect(200);

    const host = /name="siteUrl" value="([^"]*)"/.exec(page.text)?.[1] ?? '';
    expect(host).toBeTruthy();

    await request(ctx.server)
      .post('/admin/settings')
      .set('Cookie', cookie)
      .type('form')
      .send({ authorName: 'Rajib', siteUrl: 'http://127.0.0.1' })
      .expect(302);

    await request(ctx.server)
      .get('/admin/settings')
      .set('Cookie', cookie)
      .set('Host', '127.0.0.1')
      .expect(200)
      .expect((res) => expect(res.text).not.toContain('url-warning">'));
  });

  it('saves a changed site URL', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .post('/admin/settings')
      .set('Cookie', cookie)
      .type('form')
      .send({ authorName: 'Rajib', siteUrl: 'https://team-sober.com' })
      .expect(302);

    await request(ctx.server)
      .get('/admin/settings')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) =>
        expect(res.text).toContain(
          'name="siteUrl" value="https://team-sober.com"',
        ),
      );
  });
});
