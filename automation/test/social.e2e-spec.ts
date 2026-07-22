import request from 'supertest';
import sharp from 'sharp';
import { useTestApp, portraitJpeg, UploadBody } from './helpers/harness';

const ctx = useTestApp();

describe('social link previews', () => {
  const setBrand = async (cookie: string) =>
    request(ctx.server)
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
    const cookie = await ctx.signIn();
    await setBrand(cookie);

    await request(ctx.server)
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain(
          '<meta property="og:image" content="https://example.com/img/og/me.png" />',
        );
        expect(res.text).toContain('property="og:image:width" content="1200"');
        expect(res.text).toContain('property="og:image:height" content="630"');
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
    const cookie = await ctx.signIn();
    await setBrand(cookie);

    await request(ctx.server)
      .get('/projects/aws-demo-project')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('opengraph.githubassets.com');
        expect(res.text).not.toContain('property="og:image:width"');
        expect(res.text).not.toContain('property="og:image:height"');
      });
  });

  it('serves the generated card at the size it advertises', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    const server = ctx.server;

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
    const cookie = await ctx.signIn();
    await setBrand(cookie);

    await request(ctx.server)
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain(
          'Backend engineer working with C# and NestJS.',
        );
      });
  });

  it('uses the bio as the preview and search description', async () => {
    const cookie = await ctx.signIn();
    await setBrand(cookie);

    await request(ctx.server)
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain(
          'content="Backend engineer working with C# and NestJS."',
        );
      });
  });

  it('makes every preview URL absolute', async () => {
    const cookie = await ctx.signIn();
    await setBrand(cookie);

    await request(ctx.server)
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
    const cookie = await ctx.signIn();
    await setBrand(cookie);
    const server = ctx.server;

    for (const path of ['/', '/about', '/projects', '/tags']) {
      await request(server)
        .get(path)
        .expect(200)
        .expect((res) => expect(res.text).toContain('property="og:image"'));
    }
  });
});
