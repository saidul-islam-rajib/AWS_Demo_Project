import {
  ACCOUNT_BENEFITS,
  AccountBenefit,
  AccountStep,
  AccountView,
  MIN_PASSWORD_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  RECOVERY_GROUPS,
  RECOVERY_GROUP_LENGTH,
  REGISTRATION_STEPS,
  formatRecoveryCode,
} from '../../accounts/account.model';
import { initials } from '../../settings/settings.model';
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

interface Panel {
  heading: string;
  markup: string;
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

function benefitPanel(benefits: AccountBenefit[]): Panel {
  return {
    heading: 'What an account gives you',
    markup: `<ul class="account-perks">
      ${benefits
        .map(
          (benefit) => `<li class="account-perk">
            <span class="perk-icon" aria-hidden="true">${esc(benefit.icon)}</span>
            <div>
              <b>${esc(benefit.title)}</b>
              <span>${esc(benefit.detail)}</span>
            </div>
          </li>`,
        )
        .join('\n')}
    </ul>`,
  };
}

function stepPanel(steps: AccountStep[]): Panel {
  return {
    heading: 'How it works',
    markup: `<ol class="account-steps">
      ${steps
        .map(
          (step) => `<li class="account-step">
            <div>
              <b>${esc(step.title)}</b>
              <span>${esc(step.detail)}</span>
            </div>
          </li>`,
        )
        .join('\n')}
    </ol>`,
  };
}

function shell(main: string, panel?: Panel): string {
  if (!panel) return `<section class="account-shell solo">${main}</section>`;

  return `<section class="account-shell">
    ${main}
    <aside class="account-aside">
      <h2>${esc(panel.heading)}</h2>
      ${panel.markup}
    </aside>
  </section>`;
}

function errorBanner(error?: string): string {
  return error ? `<p class="account-error" role="alert">${esc(error)}</p>` : '';
}

export function registerPage(state: FormState = {}): string {
  const main = `<div class="account-main">
    <p class="account-eyebrow">Free account</p>
    <h1>Create an account</h1>
    <p class="account-lede">
      It takes one form and no email confirmation. Your progress and your
      certificates are then tied to you rather than to this browser.
    </p>

    ${errorBanner(state.error)}

    <form method="post" action="${ACCOUNT_PATHS.register}">
      ${nextField(state.next)}

      <div class="account-field">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" required autocomplete="name"
               maxlength="${MAX_NAME_LENGTH}" value="${esc(state.name ?? '')}"
               placeholder="The name on your certificates" />
      </div>

      <div class="account-field">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autocomplete="email"
               maxlength="${MAX_EMAIL_LENGTH}" value="${esc(state.email ?? '')}"
               placeholder="you@example.com" />
        <p class="account-hint">Used to sign in. Nothing is ever sent to it.</p>
      </div>

      <div class="account-field">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required
               autocomplete="new-password" minlength="${MIN_PASSWORD_LENGTH}"
               placeholder="At least ${MIN_PASSWORD_LENGTH} characters" />
      </div>

      <button class="btn btn-primary" type="submit">Create account</button>
    </form>

    <p class="account-alt">
      Already have one?
      <a href="${esc(withNext(ACCOUNT_PATHS.signIn, state.next))}">Sign in instead</a>
    </p>
  </div>`;

  return layout({
    title: 'Create an account',
    body: shell(main, stepPanel(REGISTRATION_STEPS)),
    path: ACCOUNT_PATHS.register,
    head: ACCOUNT_STYLES,
    noindex: true,
  });
}

export function signInPage(state: FormState = {}): string {
  const main = `<div class="account-main">
    <p class="account-eyebrow">Welcome back</p>
    <h1>Sign in</h1>
    <p class="account-lede">
      Pick up where you left off. You stay signed in on this device.
    </p>

    ${errorBanner(state.error)}

    <form method="post" action="${ACCOUNT_PATHS.signIn}">
      ${nextField(state.next)}

      <div class="account-field">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autocomplete="email"
               maxlength="${MAX_EMAIL_LENGTH}" value="${esc(state.email ?? '')}"
               placeholder="you@example.com" />
      </div>

      <div class="account-field">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required
               autocomplete="current-password" placeholder="Your password" />
      </div>

      <button class="btn btn-primary" type="submit">Sign in</button>
    </form>

    <p class="account-alt account-alt-row">
      <span>
        No account yet?
        <a href="${esc(withNext(ACCOUNT_PATHS.register, state.next))}">Create one</a>
      </span>
      <a href="${esc(withNext(ACCOUNT_PATHS.recover, state.next))}">Lost your password?</a>
    </p>
  </div>`;

  return layout({
    title: 'Sign in',
    body: shell(main, benefitPanel(ACCOUNT_BENEFITS)),
    path: ACCOUNT_PATHS.signIn,
    head: ACCOUNT_STYLES,
    noindex: true,
  });
}

export function accountPage(
  account: AccountView,
  certificates: { course: string; href: string; issued: string }[],
  courses: { title: string; href: string; done: number; total: number }[] = [],
): string {
  const rows = certificates
    .map(
      (certificate) => `<a class="account-cert" href="${esc(certificate.href)}">
        <span class="account-cert-mark" aria-hidden="true">★</span>
        <div>
          <b>${esc(certificate.course)}</b>
          <span>Issued ${esc(certificate.issued)}</span>
        </div>
      </a>`,
    )
    .join('\n');

  const started = courses
    .map(
      (course) => `<a class="account-cert" href="${esc(course.href)}">
        <span class="account-cert-mark" aria-hidden="true">${course.done}/${course.total}</span>
        <div>
          <b>${esc(course.title)}</b>
          <span>${course.total - course.done} left to read</span>
        </div>
      </a>`,
    )
    .join('\n');

  const main = `<div class="account-main">
    <div class="account-head">
      <span class="account-avatar" aria-hidden="true">${esc(initials(account.name))}</span>
      <div>
        <h1>${esc(account.name)}</h1>
        <p class="account-lede">${esc(account.email)}</p>
      </div>
    </div>

    <h2 class="account-section">Courses in progress</h2>
    ${
      courses.length
        ? started
        : '<p class="account-empty">Start a course and it will show up here with how far along you are.</p>'
    }

    <h2 class="account-section">Certificates</h2>
    ${
      certificates.length
        ? rows
        : '<p class="account-empty">Finish every lesson in a course and your certificate will appear here.</p>'
    }

    <form method="post" action="${ACCOUNT_PATHS.signOut}" class="account-signout">
      <button class="btn btn-ghost" type="submit">Sign out</button>
    </form>
  </div>`;

  return layout({
    title: account.name,
    body: shell(main),
    path: ACCOUNT_PATHS.home,
    head: ACCOUNT_STYLES,
    noindex: true,
  });
}

export function recoveryCodePage(code: string, next?: string): string {
  const main = `<div class="account-main">
    <p class="account-eyebrow">One-time code</p>
    <h1>Save your recovery code</h1>
    <p class="account-lede">
      Your account is ready and you are signed in. Before you go, copy this
      down.
    </p>

    <p class="recovery-code">${esc(formatRecoveryCode(code))}</p>

    <p class="recovery-warn">
      This is the only way back into your account if you forget your password.
      There is no email reset, so store it somewhere safe. It is shown once and
      cannot be retrieved later.
    </p>

    <a class="btn btn-primary" href="${esc(next && next.startsWith('/') ? next : ACCOUNT_PATHS.home)}">
      I have saved it
    </a>
  </div>`;

  return layout({
    title: 'Your recovery code',
    body: shell(main),
    path: ACCOUNT_PATHS.register,
    head: ACCOUNT_STYLES,
    noindex: true,
  });
}

export function recoverPage(state: FormState & { code?: string } = {}): string {
  const main = `<div class="account-main">
    <p class="account-eyebrow">Account recovery</p>
    <h1>Reset your password</h1>
    <p class="account-lede">
      Enter the recovery code you saved when you registered, and choose a new
      password. You will be given a fresh code to replace it.
    </p>

    ${errorBanner(state.error)}

    <form method="post" action="${ACCOUNT_PATHS.recover}">
      ${nextField(state.next)}

      <div class="account-field">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autocomplete="email"
               maxlength="${MAX_EMAIL_LENGTH}" value="${esc(state.email ?? '')}"
               placeholder="you@example.com" />
      </div>

      <div class="account-field">
        <label for="code">Recovery code</label>
        <input type="text" id="code" name="code" required autocomplete="off"
               spellcheck="false" placeholder="${esc(exampleRecoveryShape())}"
               value="${esc(state.code ?? '')}" />
        <p class="account-hint">Dashes and capitals do not matter.</p>
      </div>

      <div class="account-field">
        <label for="password">New password</label>
        <input type="password" id="password" name="password" required
               autocomplete="new-password" minlength="${MIN_PASSWORD_LENGTH}"
               placeholder="At least ${MIN_PASSWORD_LENGTH} characters" />
      </div>

      <button class="btn btn-primary" type="submit">Set a new password</button>
    </form>

    <p class="account-alt account-alt-row">
      <span>Remembered it? <a href="${ACCOUNT_PATHS.signIn}">Sign in</a></span>
      <a href="${ACCOUNT_PATHS.register}">Create an account</a>
    </p>
  </div>`;

  return layout({
    title: 'Reset your password',
    body: shell(main),
    path: ACCOUNT_PATHS.recover,
    head: ACCOUNT_STYLES,
    noindex: true,
  });
}
