import request from 'supertest';
import { useTestApp } from './helpers/harness';

const ctx = useTestApp();

const register = (extra: Record<string, string> = {}) =>
  request(ctx.server)
    .post('/account/register')
    .type('form')
    .send({
      name: 'Saidul Islam Rajib',
      email: 'rajib@example.com',
      password: 'correct-horse',
      ...extra,
    });

const sessionFrom = (res: request.Response): string =>
  (res.headers['set-cookie'] as unknown as string[])[0];

describe('accounts', () => {
  it('serves a register form', () =>
    request(ctx.server)
      .get('/account/register')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Create an account');
        expect(res.text).toContain('name="password"');
      }));

  it('creates an account and starts a session', async () => {
    const res = await register().expect(302);

    expect(res.headers.location).toBe('/account');
    expect(sessionFrom(res)).toContain('account_session');
    expect(sessionFrom(res)).toContain('HttpOnly');
  });

  it('rejects a short password without creating anything', async () => {
    await register({ password: 'short' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('at least'));

    await request(ctx.server)
      .post('/account/sign-in')
      .type('form')
      .send({ email: 'rajib@example.com', password: 'short' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));
  });

  it('rejects a malformed email', () =>
    register({ email: 'nope' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('email')));

  it('refuses a duplicate email', async () => {
    await register().expect(302);

    await register()
      .expect(200)
      .expect((res) => expect(res.text).toContain('already has an account'));
  });

  it('signs in with the right password', async () => {
    await register().expect(302);

    const res = await request(ctx.server)
      .post('/account/sign-in')
      .type('form')
      .send({ email: 'rajib@example.com', password: 'correct-horse' })
      .expect(302);

    expect(sessionFrom(res)).toContain('account_session');
  });

  it('refuses the wrong password', async () => {
    await register().expect(302);

    await request(ctx.server)
      .post('/account/sign-in')
      .type('form')
      .send({ email: 'rajib@example.com', password: 'wrong' })
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('did not match');
        expect(res.headers['set-cookie']).toBeUndefined();
      });
  });

  it('sends a signed-out visitor to sign in', () =>
    request(ctx.server)
      .get('/account')
      .expect(302)
      .expect('Location', '/account/sign-in'));

  it('shows the account page once signed in', async () => {
    const jar = sessionFrom(await register().expect(302));

    await request(ctx.server)
      .get('/account')
      .set('Cookie', jar)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Saidul Islam Rajib');
        expect(res.text).toContain('rajib@example.com');
      });
  });

  it('signs out again', async () => {
    const jar = sessionFrom(await register().expect(302));

    await request(ctx.server)
      .post('/account/sign-out')
      .set('Cookie', jar)
      .expect(302);
  });

  it('refuses a forged session cookie', () =>
    request(ctx.server)
      .get('/account')
      .set('Cookie', 'account_session=someone.9999999999999.deadbeef')
      .expect(302)
      .expect('Location', '/account/sign-in'));

  it('only follows a relative next target', async () => {
    const res = await register({ next: 'https://evil.example/steal' }).expect(
      302,
    );

    expect(res.headers.location).toBe('/account');
  });

  it('follows a relative next target', async () => {
    const res = await register({ next: '/tutorials/networking' }).expect(302);

    expect(res.headers.location).toBe('/tutorials/networking');
  });
});

describe('sign-in rate limiting', () => {
  const attempt = (password: string) =>
    request(ctx.server)
      .post('/account/sign-in')
      .type('form')
      .send({ email: 'rajib@example.com', password });

  it('locks out after repeated wrong passwords', async () => {
    await register().expect(302);

    for (let i = 0; i < 5; i += 1) {
      await attempt('wrong').expect(200);
    }

    await attempt('wrong')
      .expect(200)
      .expect((res) => expect(res.text).toContain('Too many attempts'));
  });

  it('refuses the right password while locked out', async () => {
    await register().expect(302);

    for (let i = 0; i < 5; i += 1) {
      await attempt('wrong').expect(200);
    }

    await attempt('correct-horse')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Too many attempts');
        expect(res.headers['set-cookie']).toBeUndefined();
      });
  });

  it('lets a correct password through before the limit', async () => {
    await register().expect(302);

    await attempt('wrong').expect(200);

    await attempt('correct-horse')
      .expect(302)
      .expect((res) => expect(res.headers['set-cookie']).toBeDefined());
  });
});
