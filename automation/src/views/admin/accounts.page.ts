import {
  Account,
  AccountReset,
  resetState,
} from '../../accounts/account.model';
import { describeResetState } from '../../accounts/reset-state';
import { AccountAdminRoutes } from '../../accounts/account.routes';
import { ACCOUNT_ADMIN_BUNDLE } from '../../accounts/account.assets';
import { formatRecoveryCode } from '../../accounts/recovery-code';
import { RecoveryPolicy } from '../../shared/config/policies';
import { formatDay, formatMoment } from '../../shared/format/dates';
import { css, js } from '../../shared/assets/asset.store';
import { UI_BUNDLE } from '../../shared/assets/assets.bootstrap';
import { SafeHtml, html, join, toHtml, when } from '../../shared/view/html';
import {
  Column,
  codeBlock,
  linkButton,
  panel,
  pill,
  submitButton,
  table,
  toolbar,
} from '../../shared/view/components';
import { initials } from '../../settings/settings.model';
import { adminNav, layout } from '../shared/layout';

const NOTE_MAX = 300;

const STYLES = [css(UI_BUNDLE), css(ACCOUNT_ADMIN_BUNDLE)];
const SCRIPTS = [js(UI_BUNDLE)];

export interface AccountRow {
  account: Account;
  certificates: number;
  liveReset: boolean;
}

export interface AccountsListState {
  rows: AccountRow[];
  query?: string;
  total?: number;
}

export interface IssuedReset {
  code: string;
  url: string;
}

export interface AccountDetailState {
  account: Account;
  certificates: number;
  live?: AccountReset;
  history: AccountReset[];
  issued?: IssuedReset;
  error?: string;
  flash?: string;
}

function statePill(reset: AccountReset): SafeHtml {
  return pill(describeResetState(resetState(reset)));
}

function render(title: string, body: SafeHtml, path: string): string {
  return layout({
    title,
    body: toHtml(body),
    nav: adminNav(path),
    variant: 'admin',
    styles: STYLES,
    scripts: SCRIPTS,
    noindex: true,
  });
}

export function accountsAdminPage({
  rows,
  query = '',
  total = rows.length,
}: AccountsListState): string {
  const columns: Column<AccountRow>[] = [
    {
      header: 'Learner',
      cell: ({ account }) =>
        html`<span class="t">${account.name}</span>
          <span class="s">${account.email}</span>`,
    },
    {
      header: 'Joined',
      cell: ({ account }) =>
        html`<span class="s">${formatDay(account.createdAt)}</span>`,
    },
    {
      header: 'Recovery code',
      cell: ({ account }) =>
        html`<span class="s"
          >${formatDay(account.recoveryIssuedAt ?? account.createdAt)}</span
        >`,
    },
    {
      header: 'Certificates',
      cell: ({ certificates }) =>
        html`<span class="s">${certificates || '—'}</span>`,
    },
    {
      header: '',
      align: 'end',
      cell: ({ account, liveReset }) =>
        html`${when(liveReset, () =>
          pill({ label: 'Reset waiting', tone: 'warn' }),
        )}
        ${linkButton({
          href: AccountAdminRoutes.detail.path({ id: account.id }),
          label: 'Help them in',
          variant: 'ghost',
          attrs: { class: 'btn btn-ghost btn-sm' },
        })}`,
    },
  ];

  const body = html`${toolbar({
    title: 'Accounts',
    subtitle: `${total} account${total === 1 ? '' : 's'} · issue a reset link to somebody who has lost their password and their recovery code`,
    back: { href: '/admin', label: '← Back to dashboard' },
  })}

    <form
      class="acct-search"
      action="${AccountAdminRoutes.list.template}"
      method="get"
      role="search"
    >
      <input
        type="search"
        name="q"
        value="${query}"
        placeholder="Search by name or email…"
        aria-label="Search accounts"
      />
      ${submitButton({ label: 'Search' })}
      ${when(query, () => linkButton({ href: AccountAdminRoutes.list.template, label: 'Clear', variant: 'ghost' }))}
    </form>

    ${table({
      columns,
      rows,
      empty: query
        ? `Nothing matches “${query}”.`
        : 'Nobody has registered yet.',
    })}`;

  return render('Accounts — admin', body, AccountAdminRoutes.list.template);
}

export function accountDetailPage({
  account,
  certificates,
  live,
  history,
  issued,
  error,
  flash,
}: AccountDetailState): string {
  const issuePanel = panel({
    title: live ? 'Replace the outstanding reset' : 'Issue a reset',
    body: html`${when(
      live,
      () =>
        html`<p class="ui-hint" style="margin-bottom:.9rem">
            A code issued ${formatMoment(live!.issuedAt)} is still waiting to be
            used, and expires ${formatMoment(live!.expiresAt)}. Issuing another
            cancels it.
          </p>`,
    )}
      <form
        method="post"
        action="${AccountAdminRoutes.issueReset.path({ id: account.id })}"
      >
        <div class="ui-field">
          <label for="reset-note">How did you check this is really them?</label>
          <input
            type="text"
            id="reset-note"
            name="note"
            required
            maxlength="${NOTE_MAX}"
            placeholder="Replied from the address on the account, named their course and enrolment date"
          />
          <p class="ui-hint">
            Kept with the account so there is a record of why the reset was
            given. Write what you verified, not what you were told.
          </p>
        </div>
        ${submitButton({ label: 'Issue a one-time reset code' })}
      </form>`,
  });

  const issuedPanel = when(issued, () =>
    panel({
      tone: 'accent',
      title: 'Reset code issued',
      body: html`<p class="ui-hint">
          Read this out or paste it to ${account.name} now — it is shown once
          and is not stored anywhere it can be read back. It works for one
          password change and expires in ${RecoveryPolicy.resetLinkMinutes}
          minutes.
        </p>
        ${codeBlock({ id: 'issued-code', value: formatRecoveryCode(issued!.code), copyLabel: 'Copy code' })}
        <p class="ui-copy-row">
          <button type="button" class="ui-copy" data-copy="issued-link">
            Copy link
          </button>
        </p>
        <p class="issued-link" id="issued-link">${issued!.url}</p>
        <p class="ui-hint">
          Send it only to ${account.email} or to the person you have already
          identified. Anyone holding this code can take the account.
        </p>`,
    }),
  );

  const trail = when(
    history.length,
    () =>
      html`<ul class="trail">
        ${join(
          history.map(
            (reset) =>
              html`<li>
                <div class="top">
                  <b>Issued ${formatMoment(reset.issuedAt)}</b>
                  ${statePill(reset)}
                </div>
                <p class="note">${reset.note}</p>
                ${when(reset.usedAt, () => html`<p class="when">Used ${formatMoment(reset.usedAt)}</p>`)}
                ${when(reset.revokedAt, () => html`<p class="when">Cancelled ${formatMoment(reset.revokedAt)}</p>`)}
              </li>`,
          ),
        )}
      </ul>`,
  );

  const body = html`${toolbar({
    title: 'Account recovery',
    subtitle: 'Give somebody a way back in without ever seeing their password.',
    back: {
      href: AccountAdminRoutes.list.template,
      label: '← Back to accounts',
    },
  })}
    ${when(flash, () => html`<div class="flash ok">${flash}</div>`)}
    ${when(error, () => html`<div class="flash err">${error}</div>`)}

    <div class="acct-grid">
      <div>
        ${issuedPanel} ${issuePanel}
        ${when(
          live,
          () =>
            html`<form
              method="post"
              action="${AccountAdminRoutes.revokeReset.path({ id: account.id })}"
              onsubmit="return confirm('Cancel the outstanding reset code?')"
            >
              ${submitButton({ label: 'Cancel the outstanding code', variant: 'danger', attrs: { class: 'btn btn-danger btn-sm' } })}
            </form>`,
        )}

        <h3 class="section-label" style="margin-top:1.75rem">Reset history</h3>
        ${
          history.length
            ? trail
            : html`<p class="ui-toolbar__sub">
                No reset has ever been issued for this account.
              </p>`
        }
      </div>

      <aside>
        ${panel({
          body: html`<div class="who">
              <span class="avatar">${initials(account.name)}</span>
              <div><b>${account.name}</b><span>${account.email}</span></div>
            </div>
            <ul class="facts">
              <li><span>Joined</span>${formatDay(account.createdAt)}</li>
              <li>
                <span>Recovery code from</span
                >${formatDay(account.recoveryIssuedAt ?? account.createdAt)}
              </li>
              <li><span>Certificates</span>${certificates}</li>
            </ul>`,
        })}
        ${panel({
          title: 'What this does not do',
          body: html`<p class="ui-hint">
              You cannot read anybody's password or recovery code back to them —
              both are stored one-way, on purpose. A reset code is a fresh way
              in, and the learner picks the new password themselves.
            </p>
            <p class="ui-hint" style="margin-top:.7rem">
              Their progress and certificates stay exactly as they are.
            </p>`,
        })}
      </aside>
    </div>`;

  return render(
    `${account.name} — accounts`,
    body,
    AccountAdminRoutes.list.template,
  );
}
