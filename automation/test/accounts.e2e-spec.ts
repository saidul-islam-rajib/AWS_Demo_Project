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

  it('creates an account, starts a session and shows the recovery code', async () => {
    const res = await register().expect(200);

    expect(res.text).toContain('Save your recovery code');
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
    await register().expect(200);

    await register()
      .expect(200)
      .expect((res) => expect(res.text).toContain('already has an account'));
  });

  it('signs in with the right password', async () => {
    await register().expect(200);

    const res = await request(ctx.server)
      .post('/account/sign-in')
      .type('form')
      .send({ email: 'rajib@example.com', password: 'correct-horse' })
      .expect(302);

    expect(sessionFrom(res)).toContain('account_session');
  });

  it('refuses the wrong password', async () => {
    await register().expect(200);

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
    const jar = sessionFrom(await register().expect(200));

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
    const jar = sessionFrom(await register().expect(200));

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
      200,
    );

    expect(res.text).toContain('href="/account"');
    expect(res.text).not.toContain('evil.example');
  });

  it('follows a relative next target', async () => {
    const res = await register({ next: '/tutorials/networking' }).expect(200);

    expect(res.text).toContain('href="/tutorials/networking"');
  });
});

describe('sign-in rate limiting', () => {
  const attempt = (password: string) =>
    request(ctx.server)
      .post('/account/sign-in')
      .type('form')
      .send({ email: 'rajib@example.com', password });

  it('locks out after repeated wrong passwords', async () => {
    await register().expect(200);

    for (let i = 0; i < 5; i += 1) {
      await attempt('wrong').expect(200);
    }

    await attempt('wrong')
      .expect(200)
      .expect((res) => expect(res.text).toContain('Too many attempts'));
  });

  it('refuses the right password while locked out', async () => {
    await register().expect(200);

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
    await register().expect(200);

    await attempt('wrong').expect(200);

    await attempt('correct-horse')
      .expect(302)
      .expect((res) => expect(res.headers['set-cookie']).toBeDefined());
  });
});

describe('password recovery', () => {
  const codeFrom = (html: string): string =>
    /class="recovery-code">([^<]+)</.exec(html)?.[1].trim() ?? '';

  it('serves a recovery form', () =>
    request(ctx.server)
      .get('/account/recover')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Reset your password');
        expect(res.text).toContain('name="code"');
      }));

  it('links to it from the sign-in page', () =>
    request(ctx.server)
      .get('/account/sign-in')
      .expect(200)
      .expect((res) => expect(res.text).toContain('/account/recover')));

  it('resets the password with the code from registration', async () => {
    const code = codeFrom((await register().expect(200)).text);
    expect(code).toBeTruthy();

    await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({
        email: 'rajib@example.com',
        code,
        password: 'a-brand-new-password',
      })
      .expect(200)
      .expect((res) => expect(res.text).toContain('Save your recovery code'));

    await request(ctx.server)
      .post('/account/sign-in')
      .type('form')
      .send({ email: 'rajib@example.com', password: 'a-brand-new-password' })
      .expect(302);
  });

  it('refuses a wrong code and leaves the old password working', async () => {
    await register().expect(200);

    await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({
        email: 'rajib@example.com',
        code: 'WRONG-WRONG-WRONG-WRONG',
        password: 'a-brand-new-password',
      })
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));

    await request(ctx.server)
      .post('/account/sign-in')
      .type('form')
      .send({ email: 'rajib@example.com', password: 'correct-horse' })
      .expect(302);
  });

  it('will not reuse a spent code', async () => {
    const code = codeFrom((await register().expect(200)).text);

    await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({
        email: 'rajib@example.com',
        code,
        password: 'first-new-password',
      })
      .expect(200);

    await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({ email: 'rajib@example.com', code, password: 'second-attempt' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));
  });

  it('does not reveal whether an address has an account', async () => {
    await register().expect(200);

    const known = await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({
        email: 'rajib@example.com',
        code: 'AAAAA-AAAAA-AAAAA-AAAAA',
        password: 'a-brand-new-password',
      })
      .expect(200);

    const unknown = await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({
        email: 'nobody@example.com',
        code: 'AAAAA-AAAAA-AAAAA-AAAAA',
        password: 'a-brand-new-password',
      })
      .expect(200);

    expect(known.text).toContain('did not match');
    expect(unknown.text).toContain('did not match');
  });

  it('rejects a short new password before touching the account', () =>
    request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({
        email: 'rajib@example.com',
        code: 'AAAAA-AAAAA-AAAAA-AAAAA',
        password: 'short',
      })
      .expect(200)
      .expect((res) => expect(res.text).toContain('at least')));
});
