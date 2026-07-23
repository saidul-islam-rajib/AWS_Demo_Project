import {
  AccountView,
  MIN_PASSWORD_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  RECOVERY_GROUPS,
  RECOVERY_GROUP_LENGTH,
  formatRecoveryCode,
} from '../../accounts/account.model';
import { esc, layout } from '../shared/layout';
import { ACCOUNT_STYLES } from './account.styles';

export const ACCOUNT_PATHS = {
  register: '/account/register',
  signIn: '/account/sign-in',
  signOut: '/account/sign-out',
  recover: '/account/recover',
  home: '/account',
} as const;

interface FormState {
  error?: string;
  name?: string;
  email?: string;
  next?: string;
}

function exampleRecoveryShape(): string {
  return Array.from({ length: RECOVERY_GROUPS }, () =>
    'X'.repeat(RECOVERY_GROUP_LENGTH),
  ).join('-');
}

function nextField(next?: string): string {
  return next ? `<input type="hidden" name="next" value="${esc(next)}" />` : '';
}

function withNext(path: string, next?: string): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

export function registerPage(state: FormState = {}): string {
  const body = `
    <section class="account-card">
      <h1>Create an account</h1>
      <p class="account-lede">
        An account keeps your course progress and your certificates together,
        so a certificate is issued to you once rather than to a browser.
      </p>

      ${state.error ? `<p class="account-error">${esc(state.error)}</p>` : ''}

      <form method="post" action="${ACCOUNT_PATHS.register}">
        ${nextField(state.next)}

        <div class="account-field">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required autocomplete="name"
                 maxlength="${MAX_NAME_LENGTH}" value="${esc(state.name ?? '')}" />
          <p class="account-hint">This is the name printed on your certificates.</p>
        </div>

        <div class="account-field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email"
                 maxlength="${MAX_EMAIL_LENGTH}" value="${esc(state.email ?? '')}" />
        </div>

        <div class="account-field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required
                 autocomplete="new-password" minlength="${MIN_PASSWORD_LENGTH}" />
          <p class="account-hint">At least ${MIN_PASSWORD_LENGTH} characters.</p>
        </div>

        <button class="btn btn-primary" type="submit">Create account</button>
      </form>

      <p class="account-alt">
        Already have one?
        <a href="${esc(withNext(ACCOUNT_PATHS.signIn, state.next))}">Sign in</a>
      </p>
    </section>
  `;

  return layout({
    title: 'Create an account',
    body,
    path: ACCOUNT_PATHS.register,
    head: ACCOUNT_STYLES,
    noindex: true,
  });
}

export function signInPage(state: FormState = {}): string {
  const body = `
    <section class="account-card">
      <h1>Sign in</h1>
      <p class="account-lede">Pick up where you left off.</p>

      ${state.error ? `<p class="account-error">${esc(state.error)}</p>` : ''}

      <form method="post" action="${ACCOUNT_PATHS.signIn}">
        ${nextField(state.next)}

        <div class="account-field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email"
                 maxlength="${MAX_EMAIL_LENGTH}" value="${esc(state.email ?? '')}" />
        </div>

        <div class="account-field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required
                 autocomplete="current-password" />
        </div>

        <button class="btn btn-primary" type="submit">Sign in</button>
      </form>

      <p class="account-alt">
        No account yet?
        <a href="${esc(withNext(ACCOUNT_PATHS.register, state.next))}">Create one</a>
        &middot;
        <a href="${ACCOUNT_PATHS.recover}">Lost your password?</a>
      </p>
    </section>
  `;

  return layout({
    title: 'Sign in',
    body,
    path: ACCOUNT_PATHS.signIn,
    head: ACCOUNT_STYLES,
    noindex: true,
  });
}

export function accountPage(
  account: AccountView,
  certificates: { course: string; href: string; issued: string }[],
): string {
  const rows = certificates
    .map(
      (certificate) => `<a class="account-cert" href="${esc(certificate.href)}">
        <b>${esc(certificate.course)}</b>
        <span>Issued ${esc(certificate.issued)}</span>
      </a>`,
    )
    .join('\n');

  const body = `
    <section class="account-card wide">
      <h1>${esc(account.name)}</h1>
      <p class="account-lede">${esc(account.email)}</p>

      <h2 class="account-section">Certificates</h2>
      ${
        certificates.length
          ? rows
          : '<p class="account-empty">Finish a course and your certificate will appear here.</p>'
      }

      <form method="post" action="${ACCOUNT_PATHS.signOut}" class="account-signout">
        <button class="btn btn-ghost" type="submit">Sign out</button>
      </form>
    </section>
  `;

  return layout({
    title: account.name,
    body,
    path: ACCOUNT_PATHS.home,
    head: ACCOUNT_STYLES,
    noindex: true,
  });
}

export function recoveryCodePage(code: string, next?: string): string {
  const body = `
    <section class="account-card">
      <h1>Save your recovery code</h1>
      <p class="account-lede">
        This is the only way back into your account if you forget your
        password. There is no email reset, so store it somewhere safe. It is
        shown once and cannot be retrieved later.
      </p>

      <p class="recovery-code">${esc(formatRecoveryCode(code))}</p>

      <a class="btn btn-primary" href="${esc(next && next.startsWith('/') ? next : ACCOUNT_PATHS.home)}">
        I have saved it
      </a>
    </section>
  `;

  return layout({
    title: 'Your recovery code',
    body,
    path: ACCOUNT_PATHS.register,
    head: ACCOUNT_STYLES,
    noindex: true,
  });
}

export function recoverPage(state: FormState & { code?: string } = {}): string {
  const body = `
    <section class="account-card">
      <h1>Reset your password</h1>
      <p class="account-lede">
        Enter the recovery code you saved when you registered, and choose a new
        password.
      </p>

      ${state.error ? `<p class="account-error">${esc(state.error)}</p>` : ''}

      <form method="post" action="${ACCOUNT_PATHS.recover}">
        <div class="account-field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email"
                 maxlength="${MAX_EMAIL_LENGTH}" value="${esc(state.email ?? '')}" />
        </div>

        <div class="account-field">
          <label for="code">Recovery code</label>
          <input type="text" id="code" name="code" required autocomplete="off"
                 spellcheck="false" placeholder="${esc(exampleRecoveryShape())}"
                 value="${esc(state.code ?? '')}" />
        </div>

        <div class="account-field">
          <label for="password">New password</label>
          <input type="password" id="password" name="password" required
                 autocomplete="new-password" minlength="${MIN_PASSWORD_LENGTH}" />
        </div>

        <button class="btn btn-primary" type="submit">Set a new password</button>
      </form>

      <p class="account-alt">
        Remembered it? <a href="${ACCOUNT_PATHS.signIn}">Sign in</a>
      </p>
    </section>
  `;

  return layout({
    title: 'Reset your password',
    body,
    path: ACCOUNT_PATHS.recover,
    head: ACCOUNT_STYLES,
    noindex: true,
  });
}
