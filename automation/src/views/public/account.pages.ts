import {
  ACCOUNT_BENEFITS,
  AccountBenefit,
  AccountStep,
  AccountView,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  REGISTRATION_STEPS,
  formatDay,
  formatRecoveryCode,
  recoveryCodeShape,
} from '../../accounts/account.model';
import { AccountRoutes, accountUrl } from '../../accounts/account.routes';
import { ACCOUNT_BUNDLE } from '../../accounts/account.assets';
import { RecoveryPolicy, SupportPolicy } from '../../shared/config/policies';
import { css, js } from '../../shared/assets/asset.store';
import { UI_BUNDLE } from '../../shared/assets/assets.bootstrap';
import {
  Renderable,
  SafeHtml,
  html,
  join,
  toHtml,
  when,
} from '../../shared/view/html';
import {
  banner,
  codeBlock,
  field,
  linkButton,
  submitButton,
} from '../../shared/view/components';
import { initials } from '../../settings/settings.model';
import { layout } from '../shared/layout';

const STYLES = [css(UI_BUNDLE), css(ACCOUNT_BUNDLE)];
const SCRIPTS = [js(UI_BUNDLE)];

interface FormState {
  error?: string;
  name?: string;
  email?: string;
  next?: string;
}

interface Panel {
  heading: string;
  markup: SafeHtml;
}

function nextField(next?: string): SafeHtml {
  return when(
    next,
    () => html`<input type="hidden" name="next" value="${next}" />`,
  );
}

function withNext(path: string, next?: string): string {
  return accountUrl(path, { next });
}

function benefitPanel(benefits: AccountBenefit[]): Panel {
  return {
    heading: 'What an account gives you',
    markup: html`<ul class="account-perks">
      ${join(
        benefits.map(
          (benefit) =>
            html`<li class="account-perk">
              <span class="perk-icon" aria-hidden="true">${benefit.icon}</span>
              <div><b>${benefit.title}</b><span>${benefit.detail}</span></div>
            </li>`,
        ),
      )}
    </ul>`,
  };
}

function stepPanel(steps: AccountStep[]): Panel {
  return {
    heading: 'How it works',
    markup: html`<ol class="account-steps">
      ${join(
        steps.map(
          (step) =>
            html`<li class="account-step">
              <div><b>${step.title}</b><span>${step.detail}</span></div>
            </li>`,
        ),
      )}
    </ol>`,
  };
}

function shell(main: Renderable, panel?: Panel): SafeHtml {
  if (!panel)
    return html`<section class="account-shell solo">${main}</section>`;

  return html`<section class="account-shell">
    ${main}
    <aside class="account-aside">
      <h2>${panel.heading}</h2>
      ${panel.markup}
    </aside>
  </section>`;
}

function page(title: string, body: SafeHtml, path: string): string {
  return layout({
    title,
    body: toHtml(body),
    path,
    styles: STYLES,
    scripts: SCRIPTS,
    noindex: true,
  });
}

export function registerPage(state: FormState = {}): string {
  const main = html`<div class="account-main">
    <p class="account-eyebrow">Free account</p>
    <h1>Create an account</h1>
    <p class="account-lede">
      It takes one form and no email confirmation. Your progress and your
      certificates are then tied to you rather than to this browser.
    </p>

    ${when(state.error, () => banner({ kind: 'error', message: state.error }))}

    <form method="post" action="${AccountRoutes.register.template}">
      ${nextField(state.next)}
      ${field({
        name: 'name',
        label: 'Name',
        required: true,
        autocomplete: 'name',
        value: state.name,
        placeholder: 'The name on your certificates',
        attrs: { maxlength: MAX_NAME_LENGTH },
      })}
      ${field({
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        autocomplete: 'email',
        value: state.email,
        placeholder: 'you@example.com',
        hint: 'Used to sign in. Nothing is ever sent to it.',
        attrs: { maxlength: MAX_EMAIL_LENGTH },
      })}
      ${field({
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        autocomplete: 'new-password',
        placeholder: `At least ${RecoveryPolicy.minPasswordLength} characters`,
        attrs: { minlength: RecoveryPolicy.minPasswordLength },
      })}
      ${submitButton({ label: 'Create account' })}
    </form>

    <p class="account-alt">
      Already have one?
      <a href="${withNext(AccountRoutes.signIn.template, state.next)}"
        >Sign in instead</a
      >
    </p>
  </div>`;

  return page(
    'Create an account',
    shell(main, stepPanel(REGISTRATION_STEPS)),
    AccountRoutes.register.template,
  );
}

export function signInPage(state: FormState = {}): string {
  const main = html`<div class="account-main">
    <p class="account-eyebrow">Welcome back</p>
    <h1>Sign in</h1>
    <p class="account-lede">
      Pick up where you left off. You stay signed in on this device.
    </p>

    ${when(state.error, () => banner({ kind: 'error', message: state.error }))}

    <form method="post" action="${AccountRoutes.signIn.template}">
      ${nextField(state.next)}
      ${field({
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        autocomplete: 'email',
        value: state.email,
        placeholder: 'you@example.com',
        attrs: { maxlength: MAX_EMAIL_LENGTH },
      })}
      ${field({
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        autocomplete: 'current-password',
        placeholder: 'Your password',
      })}
      ${submitButton({ label: 'Sign in' })}
    </form>

    <p class="account-alt account-alt-row">
      <span
        >No account yet?
        <a href="${withNext(AccountRoutes.register.template, state.next)}"
          >Create one</a
        >
      </span>
      <a href="${withNext(AccountRoutes.recover.template, state.next)}"
        >Lost your password?</a
      >
    </p>
  </div>`;

  return page(
    'Sign in',
    shell(main, benefitPanel(ACCOUNT_BENEFITS)),
    AccountRoutes.signIn.template,
  );
}

export interface AccountPageState {
  account: AccountView;
  certificates: { course: string; href: string; issued: string }[];
  courses?: { title: string; href: string; done: number; total: number }[];
  recoveryIssuedAt?: string;
  error?: string;
}

export function accountPage({
  account,
  certificates,
  courses = [],
  recoveryIssuedAt,
  error,
}: AccountPageState): string {
  const issued = formatDay(recoveryIssuedAt);

  const certRows = certificates.map(
    (certificate) =>
      html`<a class="account-cert" href="${certificate.href}">
        <span class="account-cert-mark" aria-hidden="true">★</span>
        <div>
          <b>${certificate.course}</b><span>Issued ${certificate.issued}</span>
        </div>
      </a>`,
  );

  const courseRows = courses.map(
    (course) =>
      html`<a class="account-cert" href="${course.href}">
        <span class="account-cert-mark" aria-hidden="true"
          >${course.done}/${course.total}</span
        >
        <div>
          <b>${course.title}</b
          ><span>${course.total - course.done} left to read</span>
        </div>
      </a>`,
  );

  const main = html`<div class="account-main">
    <div class="account-head">
      <span class="account-avatar" aria-hidden="true"
        >${initials(account.name)}</span
      >
      <div>
        <h1>${account.name}</h1>
        <p class="account-lede">${account.email}</p>
      </div>
    </div>

    <h2 class="account-section">Courses in progress</h2>
    ${
      courses.length
        ? join(courseRows)
        : html`<p class="account-empty">
            Start a course and it will show up here with how far along you are.
          </p>`
    }

    <h2 class="account-section">Certificates</h2>
    ${
      certificates.length
        ? join(certRows)
        : html`<p class="account-empty">
            Finish every lesson in a course and your certificate will appear
            here.
          </p>`
    }

    <h2 class="account-section" id="recovery">Recovery code</h2>
    ${when(error, () => banner({ kind: 'error', message: error }))}

    <div class="recovery-panel">
      <p>
        ${issued ? `Your current code was issued on ${issued}.` : 'Your current code was issued when you registered.'}
        Lost it, or not sure it is still safe? Confirm your password and we will
        show you a new one. The old code stops working straight away.
      </p>

      <form method="post" action="${AccountRoutes.rotateRecovery.template}">
        ${field({
          name: 'password',
          label: 'Your password',
          type: 'password',
          required: true,
          autocomplete: 'current-password',
          placeholder: 'Your password',
        })}
        ${submitButton({ label: 'Show me a new code', variant: 'ghost' })}
      </form>
    </div>

    <form
      method="post"
      action="${AccountRoutes.signOut.template}"
      class="account-signout"
    >
      ${submitButton({ label: 'Sign out', variant: 'ghost' })}
    </form>
  </div>`;

  return page(account.name, shell(main), AccountRoutes.home.template);
}

export type CodeContext = 'register' | 'recover' | 'rotate';

const CODE_LEDES: Record<CodeContext, string> = {
  register:
    'Your account is ready and you are signed in. Before you go, copy this down.',
  recover:
    'Your password is changed and you are signed in. This code replaces the one you just spent.',
  rotate:
    'Here is your new code. The one you had before it no longer works, so replace it wherever you kept it.',
};

export function recoveryCodePage(
  code: string,
  next?: string,
  context: CodeContext = 'register',
): string {
  const target =
    next && next.startsWith('/') ? next : AccountRoutes.home.template;

  const main = html`<div class="account-main">
    <p class="account-eyebrow">One-time code</p>
    <h1>Save your recovery code</h1>
    <p class="account-lede">${CODE_LEDES[context]}</p>

    ${codeBlock({ id: 'recovery-code', value: formatRecoveryCode(code), copyLabel: 'Copy code' })}

    <p class="recovery-warn">
      Store it somewhere safe: with it you can reset your password yourself,
      without waiting on anybody. It is shown once and cannot be looked up later
      — not by us either. If you do lose both this and your password,
      <a href="${AccountRoutes.recover.template}#stuck"
        >we can still get you back in</a
      >.
    </p>

    ${linkButton({ href: target, label: 'I have saved it' })}
  </div>`;

  return page(
    'Your recovery code',
    shell(main),
    AccountRoutes.register.template,
  );
}

export function recoverPage(state: FormState & { code?: string } = {}): string {
  const main = html`<div class="account-main">
    <p class="account-eyebrow">Account recovery</p>
    <h1>Reset your password</h1>
    <p class="account-lede">
      Enter the recovery code you saved when you registered, and choose a new
      password. You will be given a fresh code to replace it.
    </p>

    ${when(state.error, () => banner({ kind: 'error', message: state.error }))}

    <form method="post" action="${AccountRoutes.recover.template}">
      ${nextField(state.next)}
      ${field({
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        autocomplete: 'email',
        value: state.email,
        placeholder: 'you@example.com',
        attrs: { maxlength: MAX_EMAIL_LENGTH },
      })}
      ${field({
        name: 'code',
        label: 'Recovery code',
        required: true,
        value: state.code,
        placeholder: recoveryCodeShape(),
        hint: 'Dashes and capitals do not matter.',
        attrs: { autocomplete: 'off', spellcheck: 'false' },
      })}
      ${field({
        name: 'password',
        label: 'New password',
        type: 'password',
        required: true,
        autocomplete: 'new-password',
        placeholder: `At least ${RecoveryPolicy.minPasswordLength} characters`,
        attrs: { minlength: RecoveryPolicy.minPasswordLength },
      })}
      ${submitButton({ label: 'Set a new password' })}
    </form>

    ${stuckPanel()}

    <p class="account-alt account-alt-row">
      <span
        >Remembered it?
        <a href="${AccountRoutes.signIn.template}">Sign in</a></span
      >
      <a href="${AccountRoutes.register.template}">Create an account</a>
    </p>
  </div>`;

  return page(
    'Reset your password',
    shell(main),
    AccountRoutes.recover.template,
  );
}

function stuckPanel(): SafeHtml {
  return html`<div class="account-stuck" id="stuck">
    <b>Lost the code as well?</b>
    <p>
      Nobody can read your code back to you — it is stored the same way your
      password is. What we can do is issue a one-time reset link that does the
      same job. Ask on
      <a href="${SupportPolicy.channelUrl}">${SupportPolicy.channelLabel}</a>,
      from the address on the account, and say which course you were taking. You
      will be sent a code that works once and expires after
      ${RecoveryPolicy.resetLinkMinutes} minutes.
    </p>
    <p>Your progress and certificates are untouched by any of this.</p>
  </div>`;
}

export function resetPage(state: FormState & { code?: string } = {}): string {
  const main = html`<div class="account-main">
    <p class="account-eyebrow">Reset link</p>
    <h1>Choose a new password</h1>
    <p class="account-lede">
      This code was issued for one account and can be used once, within
      ${RecoveryPolicy.resetLinkMinutes} minutes. Set a password and you will be
      signed in with a fresh recovery code.
    </p>

    ${when(state.error, () => banner({ kind: 'error', message: state.error }))}

    <form method="post" action="${AccountRoutes.reset.template}">
      ${nextField(state.next)}
      ${field({
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        autocomplete: 'email',
        value: state.email,
        placeholder: 'you@example.com',
        hint: 'The address on the account the code was issued for.',
        attrs: { maxlength: MAX_EMAIL_LENGTH },
      })}
      ${field({
        name: 'code',
        label: 'Reset code',
        required: true,
        value: state.code,
        placeholder: recoveryCodeShape(),
        hint: 'Dashes and capitals do not matter.',
        attrs: { autocomplete: 'off', spellcheck: 'false' },
      })}
      ${field({
        name: 'password',
        label: 'New password',
        type: 'password',
        required: true,
        autocomplete: 'new-password',
        placeholder: `At least ${RecoveryPolicy.minPasswordLength} characters`,
        attrs: { minlength: RecoveryPolicy.minPasswordLength },
      })}
      ${submitButton({ label: 'Set a new password' })}
    </form>

    <p class="account-alt account-alt-row">
      <span
        >Code expired?
        <a href="${AccountRoutes.recover.template}">Ask for another</a></span
      >
      <a href="${AccountRoutes.signIn.template}">Sign in</a>
    </p>
  </div>`;

  return page(
    'Choose a new password',
    shell(main),
    AccountRoutes.reset.template,
  );
}
