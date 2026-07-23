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

const codeFrom = (html: string): string =>
  /id="recovery-code" class="recovery-code">([^<]+)</.exec(html)?.[1].trim() ??
  '';

const issuedCodeFrom = (html: string): string =>
  /class="code" id="issued-code">([^<]+)</.exec(html)?.[1].trim() ?? '';

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

  it('signs the learner in rather than making them do it again', async () => {
    const code = codeFrom((await register().expect(200)).text);

    const res = await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({ email: 'rajib@example.com', code, password: 'a-new-password' })
      .expect(200);

    expect(sessionFrom(res)).toContain('account_session');
  });

  it('tells somebody who has lost the code too where to turn', () =>
    request(ctx.server)
      .get('/account/recover')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Lost the code as well?');
        expect(res.text).toContain('one-time reset link');
      }));
});

describe('swapping a lost recovery code', () => {
  it('offers the swap on the account page', async () => {
    const jar = sessionFrom(await register().expect(200));

    await request(ctx.server)
      .get('/account')
      .set('Cookie', jar)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Recovery code');
        expect(res.text).toContain('action="/account/recovery"');
      });
  });

  it('shows a new code once the password is confirmed', async () => {
    const first = await register().expect(200);
    const jar = sessionFrom(first);

    const res = await request(ctx.server)
      .post('/account/recovery')
      .set('Cookie', jar)
      .type('form')
      .send({ password: 'correct-horse' })
      .expect(200);

    expect(codeFrom(res.text)).toBeTruthy();
    expect(codeFrom(res.text)).not.toBe(codeFrom(first.text));
  });

  it('retires the code it replaces', async () => {
    const first = await register().expect(200);
    const old = codeFrom(first.text);

    await request(ctx.server)
      .post('/account/recovery')
      .set('Cookie', sessionFrom(first))
      .type('form')
      .send({ password: 'correct-horse' })
      .expect(200);

    await request(ctx.server)
      .post('/account/recover')
      .type('form')
      .send({ email: 'rajib@example.com', code: old, password: 'no-thank-you' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));
  });

  it('refuses the wrong password without issuing anything', async () => {
    const jar = sessionFrom(await register().expect(200));

    await request(ctx.server)
      .post('/account/recovery')
      .set('Cookie', jar)
      .type('form')
      .send({ password: 'wrong' })
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('did not match');
        expect(codeFrom(res.text)).toBe('');
      });
  });

  it('sends a signed-out visitor to sign in instead', () =>
    request(ctx.server)
      .post('/account/recovery')
      .type('form')
      .send({ password: 'correct-horse' })
      .expect(302)
      .expect('Location', '/account/sign-in'));
});

describe('resets the owner issues by hand', () => {
  const accountId = async (admin: string): Promise<string> => {
    const res = await request(ctx.server)
      .get('/admin/accounts')
      .set('Cookie', admin)
      .expect(200);

    return /href="\/admin\/accounts\/([^"]+)"/.exec(res.text)?.[1] ?? '';
  };

  const issue = async (
    admin: string,
    note = 'Replied from the address on the account',
  ): Promise<string> => {
    const id = await accountId(admin);

    const res = await request(ctx.server)
      .post(`/admin/accounts/${id}/reset`)
      .set('Cookie', admin)
      .type('form')
      .send({ note })
      .expect(200);

    return issuedCodeFrom(res.text);
  };

  it('keeps the account list behind the admin sign-in', () =>
    request(ctx.server)
      .get('/admin/accounts')
      .expect(302)
      .expect('Location', '/login'));

  it('lists the learners who have registered', async () => {
    await register().expect(200);
    const admin = await ctx.signIn();

    await request(ctx.server)
      .get('/admin/accounts')
      .set('Cookie', admin)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Saidul Islam Rajib');
        expect(res.text).toContain('rajib@example.com');
      });
  });

  it('finds an account by part of the email', async () => {
    await register().expect(200);
    const admin = await ctx.signIn();

    await request(ctx.server)
      .get('/admin/accounts?q=nobody')
      .set('Cookie', admin)
      .expect(200)
      .expect((res) => expect(res.text).not.toContain('rajib@example.com'));
  });

  it('will not issue a reset without a record of the check', async () => {
    await register().expect(200);
    const admin = await ctx.signIn();

    const id = await accountId(admin);

    await request(ctx.server)
      .post(`/admin/accounts/${id}/reset`)
      .set('Cookie', admin)
      .type('form')
      .send({ note: '   ' })
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('how you checked');
        expect(issuedCodeFrom(res.text)).toBe('');
      });
  });

  it('shows the code once, with a link the learner can follow', async () => {
    await register().expect(200);
    const admin = await ctx.signIn();

    const id = await accountId(admin);

    const issued = await request(ctx.server)
      .post(`/admin/accounts/${id}/reset`)
      .set('Cookie', admin)
      .type('form')
      .send({ note: 'Replied from the address on the account' })
      .expect(200);

    expect(issuedCodeFrom(issued.text)).toBeTruthy();
    expect(issued.text).toContain('/account/reset?code=');

    await request(ctx.server)
      .get(`/admin/accounts/${id}`)
      .set('Cookie', admin)
      .expect(200)
      .expect((res) => {
        expect(issuedCodeFrom(res.text)).toBe('');
        expect(res.text).toContain('Replied from the address on the account');
      });
  });

  it('sets a new password, signs the learner in and replaces their code', async () => {
    await register().expect(200);
    const code = await issue(await ctx.signIn());

    const res = await request(ctx.server)
      .post('/account/reset')
      .type('form')
      .send({
        email: 'rajib@example.com',
        code,
        password: 'chosen-by-the-learner',
      })
      .expect(200);

    expect(res.text).toContain('Save your recovery code');
    expect(codeFrom(res.text)).toBeTruthy();
    expect(sessionFrom(res)).toContain('account_session');

    await request(ctx.server)
      .post('/account/sign-in')
      .type('form')
      .send({ email: 'rajib@example.com', password: 'chosen-by-the-learner' })
      .expect(302);
  });

  it('prefills the code from the link', async () => {
    await register().expect(200);
    const code = await issue(await ctx.signIn());

    await request(ctx.server)
      .get(`/account/reset?code=${code}`)
      .expect(200)
      .expect((res) => expect(res.text).toContain(`value="${code}"`));
  });

  it('will not spend the same code twice', async () => {
    await register().expect(200);
    const code = await issue(await ctx.signIn());

    const spend = (password: string) =>
      request(ctx.server)
        .post('/account/reset')
        .type('form')
        .send({ email: 'rajib@example.com', code, password });

    await spend('chosen-by-the-learner').expect(200);

    await spend('a-second-go')
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));
  });

  it('will not open an account the code was not cut for', async () => {
    await register().expect(200);
    const code = await issue(await ctx.signIn());

    await register({ email: 'other@example.com' }).expect(200);

    await request(ctx.server)
      .post('/account/reset')
      .type('form')
      .send({ email: 'other@example.com', code, password: 'not-my-code' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));
  });

  it('leaves the old password working until the code is spent', async () => {
    await register().expect(200);
    await issue(await ctx.signIn());

    await request(ctx.server)
      .post('/account/sign-in')
      .type('form')
      .send({ email: 'rajib@example.com', password: 'correct-horse' })
      .expect(302);
  });

  it('cancels an outstanding code on request', async () => {
    await register().expect(200);
    const admin = await ctx.signIn();

    const code = await issue(admin);
    const id = await accountId(admin);

    await request(ctx.server)
      .post(`/admin/accounts/${id}/revoke`)
      .set('Cookie', admin)
      .expect(302)
      .expect('Location', `/admin/accounts/${id}?ok=revoked`);

    await request(ctx.server)
      .post('/account/reset')
      .type('form')
      .send({ email: 'rajib@example.com', code, password: 'too-late-now' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));
  });

  it('cancels the earlier code when a second is issued', async () => {
    await register().expect(200);
    const admin = await ctx.signIn();

    const first = await issue(admin);
    await issue(admin, 'Called back on the number we had');

    await request(ctx.server)
      .post('/account/reset')
      .type('form')
      .send({ email: 'rajib@example.com', code: first, password: 'stale-code' })
      .expect(200)
      .expect((res) => expect(res.text).toContain('did not match'));
  });

  it('does not reveal whether an address has an account', async () => {
    await register().expect(200);

    const unknown = await request(ctx.server)
      .post('/account/reset')
      .type('form')
      .send({
        email: 'nobody@example.com',
        code: 'AAAAA-AAAAA-AAAAA-AAAAA',
        password: 'a-brand-new-password',
      })
      .expect(200);

    const known = await request(ctx.server)
      .post('/account/reset')
      .type('form')
      .send({
        email: 'rajib@example.com',
        code: 'AAAAA-AAAAA-AAAAA-AAAAA',
        password: 'a-brand-new-password',
      })
      .expect(200);

    expect(unknown.text).toContain('did not match');
    expect(known.text).toContain('did not match');
  });
});
