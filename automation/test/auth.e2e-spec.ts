import request from 'supertest';
import { useTestApp, PASSWORD } from './helpers/harness';

const ctx = useTestApp();

describe('auth', () => {
  it('redirects anonymous visitors away from /admin', () =>
    request(ctx.server).get('/admin').expect(302).expect('Location', '/login'));

  it('rejects a wrong password', () =>
    request(ctx.server)
      .post('/login')
      .type('form')
      .send({ password: 'nope' })
      .expect(302)
      .expect('Location', '/login?error=1'));

  it('grants access with the right password', async () => {
    const cookie = await ctx.signIn();

    await request(ctx.server)
      .get('/admin')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Dashboard');
      });
  });

  it('blocks writes without a session', () =>
    request(ctx.server)
      .post('/admin/posts/new')
      .type('form')
      .send({ title: 'Sneaky', content: 'x' })
      .expect(302)
      .expect('Location', '/login'));
});

describe('login rate limiting', () => {
  const guess = (password = 'wrong') =>
    request(ctx.server).post('/login').type('form').send({ password });

  it('locks the address after five wrong passwords', async () => {
    for (let i = 0; i < 4; i++) {
      await guess().expect(302).expect('Location', '/login?error=1');
    }

    await guess().expect(302).expect('Location', '/login?locked=1');
  });

  it('refuses the correct password while locked', async () => {
    for (let i = 0; i < 5; i++) await guess();

    await guess(PASSWORD).expect(302).expect('Location', '/login?locked=1');
  });

  it('tells the visitor how long to wait', async () => {
    for (let i = 0; i < 5; i++) await guess();

    await request(ctx.server)
      .get('/login?locked=1')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Too many failed attempts');
        expect(res.text).toMatch(/Try again in \d+ minutes?\./);
      });
  });

  it('does not count a successful sign-in against the limit', async () => {
    for (let i = 0; i < 4; i++) await guess();

    await request(ctx.server)
      .post('/login')
      .type('form')
      .send({ password: PASSWORD })
      .expect(302)
      .expect('Location', '/admin');

    await guess().expect(302).expect('Location', '/login?error=1');
  });
});
