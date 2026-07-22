import request from 'supertest';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { useTestApp } from './helpers/harness';

const ctx = useTestApp();

describe('about page', () => {
  it('never shows admin prompts to visitors', () =>
    request(ctx.server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        expect(res.text).not.toContain('Add your story');
        expect(res.text).not.toContain('starter content');
        expect(res.text).not.toContain('/admin/about');
      }));

  it('nudges the admin to add what only they can write', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .get('/about')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('starter content');
        expect(res.text).toContain('/admin/about');
      });
  });

  it('seeds skills and learning items without inventing a biography', () =>
    request(ctx.server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Topics covered');
        expect(res.text).toContain('Learning curve');
        expect(res.text).toContain('Docker');
        expect(res.text).not.toContain('Journey');
      }));

  it('requires a session to edit', () =>
    request(ctx.server)
      .get('/admin/about')
      .expect(302)
      .expect('Location', '/login'));

  it('saves every section and renders them publicly', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({
        headline: 'Building things, mostly backends',
        intro: '## Hello\n\nI am a **software engineer**.',
        milestonePeriod: ['2024 — present', '2022 — 2024'],
        milestoneTitle: ['Software Engineer', 'Junior Developer'],
        milestoneOrg: ['Acme Corp', 'First Startup'],
        milestoneDescription: ['Backend and infra', 'Where it started'],
        skillGroupName: ['Backend', 'DevOps'],
        skillGroupItems: ['NestJS, PostgreSQL', 'Docker, Jenkins'],
        learningTitle: ['Kubernetes', 'Rust'],
        learningNote: ['for orchestration', 'for fun'],
        learningStatus: ['learning', 'planned'],
        galleryUrls: ['/uploads/photo.png'],
        galleryCaption: ['At the desk'],
        socialLabel: ['LinkedIn'],
        socialUrl: ['https://linkedin.com/in/example'],
      })
      .expect(302)
      .expect('Location', '/admin/about?saved=1');

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Building things, mostly backends');
        expect(res.text).toContain('<strong>software engineer</strong>');
        expect(res.text).toContain('Software Engineer');
        expect(res.text).toContain('Acme Corp');
        expect(res.text).toContain('NestJS');
        expect(res.text).toContain('Kubernetes');
        expect(res.text).toContain('Learning now');
        expect(res.text).toContain('Planned');
        expect(res.text).toContain('/uploads/photo.png');
        expect(res.text).toContain('At the desk');
        expect(res.text).toContain('linkedin.com/in/example');
        expect(res.text).not.toContain('has not been filled in yet');
      });
  });

  it('justifies every prose block, on all screen sizes', async () => {
    const res = await request(ctx.server).get('/about').expect(200);

    expect(res.text).toMatch(
      /\.about-intro,[\s\S]{0,200}\.milestone-body,[\s\S]{0,200}text-align: justify/,
    );
    expect(res.text).toContain('.gallery figcaption,');
    expect(res.text).toContain('hyphens: auto');
    expect(res.text).not.toContain('.about-intro { text-align: left; }');
  });

  it('renders markdown in the intro', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({
        intro: [
          'I build **reliable software** with [C#](https://learn.microsoft.com) and `NestJS`.',
          '',
          '## What I focus on',
          '',
          '- Backend APIs',
          '- Deployment',
        ].join('\n'),
      })
      .expect(302);

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('<strong>reliable software</strong>');
        expect(res.text).toContain('href="https://learn.microsoft.com"');
        expect(res.text).toContain('<code>NestJS</code>');
        expect(res.text).toMatch(/<h2[^>]*>What I focus on<\/h2>/);
        expect(res.text).toContain('<li>Backend APIs</li>');
      });
  });

  it('orders the journey newest first and renders its markdown', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({
        milestoneTitle: [
          'Intern Engineer',
          'Senior Engineer',
          'Junior Engineer',
        ],
        milestoneOrg: ['First Co', 'Third Co', 'Second Co'],
        milestoneStart: ['2022-10', '2025-11', '2023-01'],
        milestoneEnd: ['2023-01', '', '2025-11'],
        milestoneDescription: [
          'Learned **a lot** here.',
          'Working with ==Kubernetes== now.',
          '- Built APIs\n- Shipped features',
        ],
      })
      .expect(302);

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        const senior = res.text.indexOf('Senior Engineer');
        const junior = res.text.indexOf('Junior Engineer');
        const intern = res.text.indexOf('Intern Engineer');

        expect(senior).toBeLessThan(junior);
        expect(junior).toBeLessThan(intern);

        expect(res.text).toContain('Nov 2025 — Present');
        expect(res.text).toContain('Oct 2022 — Jan 2023');

        expect(res.text).toContain('<strong>a lot</strong>');
        expect(res.text).toContain('<mark>Kubernetes</mark>');
        expect(res.text).toContain('<li>Built APIs</li>');
      });
  });

  it('serves the page when milestones predate the date fields', async () => {
    writeFileSync(
      join(ctx.dir, 'about.json'),
      JSON.stringify({
        headline: '',
        intro: 'hello',
        milestones: [
          {
            period: 'OCT 2022 to Jan 2023',
            title: 'Intern',
            org: 'ASA',
            description: 'a',
          },
          {
            period: 'Jan 2023 to Nov 2025',
            title: 'Junior',
            org: 'ASA',
            description: 'b',
          },
          {
            period: 'Nov 2025 to Present',
            title: 'Senior',
            org: 'BS23',
            description: 'c',
          },
        ],
        skillGroups: [],
        learning: [],
        gallery: [],
        socials: [],
      }),
      'utf8',
    );

    await request(ctx.server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Intern');
        expect(res.text).toContain('Senior');
        expect(res.text.indexOf('Senior')).toBeLessThan(
          res.text.indexOf('Intern'),
        );
      });
  });

  it('has no period label field in the editor', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .get('/admin/about')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => {
        expect(res.text).not.toContain('name="milestonePeriod"');
        expect(res.text).toContain('current-check');
        expect(res.text).toContain('period-preview');
      });
  });

  it('treats a cleared end date as the current role and ranks it first', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({
        milestoneTitle: ['Finished Recently', 'Current Role'],
        milestoneOrg: ['Old Co', 'New Co'],
        milestoneStart: ['2024-01', '2025-06'],
        milestoneEnd: ['2026-02', ''],
        milestoneDescription: ['a', 'b'],
      })
      .expect(302);

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        expect(res.text.indexOf('Current Role')).toBeLessThan(
          res.text.indexOf('Finished Recently'),
        );
        expect(res.text).toContain('Jun 2025 — Present');
      });
  });

  it('serves gallery thumbnails resized, not the full original', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({
        galleryUrls: ['/uploads/photo.png'],
        galleryCaption: ['A photo'],
      })
      .expect(302);

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        const figure = /<figure class="shot"[\s\S]*?<\/figure>/.exec(
          res.text,
        )?.[0] as string;

        expect(figure).toContain('/img/photo.png?w=400');
        expect(figure).toContain('srcset=');
        expect(figure).toContain('/img/photo.png?w=800');
        expect(figure).not.toContain('src="/uploads/');

        expect(figure).toContain('width="400"');
        expect(figure).toContain('loading="lazy"');
        expect(figure).toContain('decoding="async"');
      });
  });

  it('shows only the first image of a record, and defers the rest', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({
        galleryUrls: [
          ['/uploads/a.png', '/uploads/b.png', '/uploads/c.png'].join('\n'),
        ],
        galleryCaption: ['Three images'],
      })
      .expect(302);

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        const figure = /<figure class="shot"[\s\S]*?<\/figure>/.exec(
          res.text,
        )?.[0] as string;

        expect((figure.match(/ src="/g) ?? []).length).toBe(1);
        expect((figure.match(/data-src="/g) ?? []).length).toBe(2);
        expect((figure.match(/hidden/g) ?? []).length).toBe(2);

        expect(res.text).toContain('.gallery img[hidden]');
      });
  });

  it('renders a multi-image record with slider controls', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({
        galleryUrls: [
          ['/uploads/a.png', '/uploads/b.png', '/uploads/c.png'].join('\n'),
        ],
        galleryCaption: ['A short caption'],
      })
      .expect(302);

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('/uploads/a.png');
        expect(res.text).toContain('/uploads/c.png');
        expect(res.text).toContain('class="shot-nav next"');
        expect(res.text).toContain('class="shot-dots"');
        expect(res.text).toMatch(/<span class="at">1<\/span>\/3/);
      });
  });

  it('shows no slider controls for a single image', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({
        galleryUrls: ['/uploads/only.png'],
        galleryCaption: ['Just one'],
      })
      .expect(302);

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('/uploads/only.png');
        const figure = /<figure class="shot"[\s\S]*?<\/figure>/.exec(
          res.text,
        )?.[0] as string;
        expect(figure).not.toContain('shot-dots');
        expect(figure).not.toContain('shot-nav');
        expect(figure).not.toContain('shot-count');
      });
  });

  it('truncates a long caption and offers See more', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;
    const longCaption =
      'I was a student and did not have money for the job application, so I took 500 from my mother to capture this picture and apply for the 44th BCS examination.';

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({
        galleryUrls: ['/uploads/a.png'],
        galleryCaption: [longCaption],
      })
      .expect(302);

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('class="see-more"');
        const visible =
          /<span class="cap-text">([^<]*)</.exec(res.text)?.[1] ?? '';
        expect(visible.length).toBeLessThan(longCaption.length);
        expect(visible.endsWith('…')).toBe(true);
        expect(res.text).toContain('id="gallery-data"');
      });
  });

  it('keeps a short caption inline with no See more', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({ galleryUrls: ['/uploads/a.png'], galleryCaption: ['Short.'] })
      .expect(302);

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Short.');
        expect(res.text).not.toContain('class="see-more"');
      });
  });

  it('drops an unsafe social url', async () => {
    const cookie = await ctx.signIn();
    const server = ctx.server;

    await request(server)
      .post('/admin/about')
      .set('Cookie', cookie)
      .type('form')
      .send({
        intro: 'x',
        socialLabel: ['Evil'],
        socialUrl: ['javascript:alert(1)'],
      })
      .expect(302);

    await request(server)
      .get('/about')
      .expect(200)
      .expect((res) => expect(res.text).not.toContain('javascript:alert'));
  });

  it('is linked from the public nav', () =>
    request(ctx.server)
      .get('/')
      .expect(200)
      .expect((res) => expect(res.text).toContain('href="/about"')));
});
