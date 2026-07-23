import request from 'supertest';
import { useTestApp } from './helpers/harness';

const ctx = useTestApp();

describe('platform configuration', () => {
  it('shows the config groups on the settings page', async () => {
    const admin = await ctx.signIn();

    await request(ctx.server)
      .get('/admin/settings')
      .set('Cookie', admin)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Platform configuration');
        expect(res.text).toContain('Security &amp; rate limiting');
        expect(res.text).toContain('name="recovery.resetLinkMinutes"');
      });
  });

  it('keeps the config form behind the admin sign-in', () =>
    request(ctx.server)
      .post('/admin/settings/config')
      .type('form')
      .send({ 'recovery.resetLinkMinutes': '30' })
      .expect(302)
      .expect('Location', '/login'));

  it('saves a changed value, clamped into range', async () => {
    const admin = await ctx.signIn();

    await request(ctx.server)
      .post('/admin/settings/config')
      .set('Cookie', admin)
      .type('form')
      .send({ 'security.maxLoginAttempts': '999' })
      .expect(302)
      .expect('Location', '/admin/settings?saved=1#config');

    await request(ctx.server)
      .get('/admin/settings')
      .set('Cookie', admin)
      .expect(200)
      .expect((res) =>
        expect(res.text).toContain(
          'name="security.maxLoginAttempts" value="50"',
        ),
      );
  });

  it('changes recovery behaviour live, without a restart', async () => {
    const admin = await ctx.signIn();

    await request(ctx.server)
      .post('/admin/settings/config')
      .set('Cookie', admin)
      .type('form')
      .send({ 'recovery.resetLinkMinutes': '5' })
      .expect(302);

    await request(ctx.server)
      .get('/account/reset')
      .expect(200)
      .expect((res) => expect(res.text).toMatch(/within\s+5 minutes/));
  });
});

describe('served assets', () => {
  const hrefFrom = (html: string): string =>
    /href="(\/assets\/css\/[^"]+)"/.exec(html)?.[1] ?? '';

  it('links account pages to a fingerprinted stylesheet', () =>
    request(ctx.server)
      .get('/account/sign-in')
      .expect(200)
      .expect((res) =>
        expect(res.text).toMatch(/\/assets\/css\/ui\.[0-9a-f]{12}\.css/),
      ));

  it('serves that stylesheet immutably', async () => {
    const page = await request(ctx.server).get('/account/sign-in').expect(200);
    const href = hrefFrom(page.text);

    await request(ctx.server)
      .get(href)
      .expect(200)
      .expect('Content-Type', /text\/css/)
      .expect('Cache-Control', /immutable/);
  });

  it('404s an asset whose fingerprint is wrong', () =>
    request(ctx.server).get('/assets/css/ui.000000000000.css').expect(404));
});
