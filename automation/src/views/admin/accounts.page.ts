import {
  Account,
  AccountReset,
  RESET_LINK_MINUTES,
  RESET_STATE_LABELS,
  formatDay,
  formatMoment,
  formatRecoveryCode,
  resetState,
} from '../../accounts/account.model';
import { initials } from '../../settings/settings.model';
import { adminNav, esc, layout } from '../shared/layout';
import { COPY_CODE_SCRIPT } from '../shared/scripts/copy-code';
import { ACCOUNTS_ADMIN_STYLES as CSS } from './accounts.styles';

const MAX_NOTE_LENGTH = 300;

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

function stateBadge(reset: AccountReset): string {
  const state = resetState(reset);

  return `<span class="state state-${state}">${esc(RESET_STATE_LABELS[state])}</span>`;
}

export function accountsAdminPage({
  rows,
  query = '',
  total = rows.length,
}: AccountsListState): string {
  const body = `
${CSS}
  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin">← Back to dashboard</a>
      <h1 class="page-title" style="margin-bottom:.15rem">Accounts</h1>
      <p class="subtitle">
        ${total} account${total === 1 ? '' : 's'} · issue a reset link to
        somebody who has lost their password and their recovery code
      </p>
    </div>
  </div>

  <form class="admin-search" action="/admin/accounts" method="get" role="search">
    <input type="search" name="q" value="${esc(query)}"
           placeholder="Search by name or email…" aria-label="Search accounts" />
    <button class="btn" type="submit">Search</button>
    ${query ? '<a class="btn btn-ghost" href="/admin/accounts">Clear</a>' : ''}
  </form>

  ${
    rows.length
      ? `<div class="acct-table-wrap"><table>
    <thead><tr>
      <th>Learner</th><th>Joined</th><th>Recovery code</th><th>Certificates</th><th class="col-actions"></th>
    </tr></thead>
    <tbody>
      ${rows
        .map(
          ({ account, certificates, liveReset }) => `<tr>
        <td>
          <span class="t">${esc(account.name)}</span>
          <span class="s">${esc(account.email)}</span>
        </td>
        <td class="s">${esc(formatDay(account.createdAt))}</td>
        <td class="s">${esc(formatDay(account.recoveryIssuedAt ?? account.createdAt))}</td>
        <td class="s">${certificates || '—'}</td>
        <td class="col-actions">
          ${liveReset ? '<span class="state state-live">Reset waiting</span> ' : ''}
          <a class="btn btn-ghost btn-sm" href="/admin/accounts/${esc(account.id)}">Help them in</a>
        </td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table></div>`
      : `<div class="empty">
      <p>${query ? `Nothing matches “${esc(query)}”.` : 'Nobody has registered yet.'}</p>
      ${query ? '<p style="margin-top:1.25rem"><a class="btn btn-ghost" href="/admin/accounts">Clear search</a></p>' : ''}
    </div>`
  }`;

  return layout({
    title: 'Accounts — admin',
    body,
    nav: adminNav('/admin/accounts'),
    variant: 'admin',
    noindex: true,
  });
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
  const body = `
${CSS}
  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin/accounts">← Back to accounts</a>
      <h1 class="page-title" style="margin-bottom:.15rem">Account recovery</h1>
      <p class="subtitle">Give somebody a way back in without ever seeing their password.</p>
    </div>
  </div>

  ${flash ? `<div class="flash ok">${esc(flash)}</div>` : ''}
  ${error ? `<div class="flash err">${esc(error)}</div>` : ''}

  <div class="form-grid">
    <div>
      ${
        issued
          ? `<div class="issued">
        <h3>Reset code issued</h3>
        <p>
          Read this out or paste it to ${esc(account.name)} now — it is shown
          once and is not stored anywhere it can be read back. It works for one
          password change and expires in ${RESET_LINK_MINUTES} minutes.
        </p>

        <p class="code" id="issued-code">${esc(formatRecoveryCode(issued.code))}</p>
        <p class="copy-row">
          <button type="button" class="copy-btn" data-copy="issued-code">Copy code</button>
          <button type="button" class="copy-btn" data-copy="issued-link">Copy link</button>
        </p>

        <p class="link" id="issued-link">${esc(issued.url)}</p>
        <p>
          Send it only to ${esc(account.email)} or to the person you have
          already identified. Anyone holding this code can take the account.
        </p>
      </div>`
          : ''
      }

      <div class="panel">
        <h3>${live ? 'Replace the outstanding reset' : 'Issue a reset'}</h3>

        ${
          live
            ? `<p class="hint" style="margin-bottom:.9rem">
          A code issued ${esc(formatMoment(live.issuedAt))} is still waiting to be
          used, and expires ${esc(formatMoment(live.expiresAt))}. Issuing another
          cancels it.
        </p>`
            : ''
        }

        <form method="post" action="/admin/accounts/${esc(account.id)}/reset">
          <div class="field">
            <label for="note">How did you check this is really them?</label>
            <input type="text" id="note" name="note" required
                   maxlength="${MAX_NOTE_LENGTH}"
                   placeholder="Replied from the address on the account, named their course and enrolment date" />
            <p class="hint">
              Kept with the account so there is a record of why the reset was
              given. Write what you verified, not what you were told.
            </p>
          </div>

          <button class="btn" type="submit">Issue a one-time reset code</button>
        </form>
      </div>

      ${
        live
          ? `<form method="post" action="/admin/accounts/${esc(account.id)}/revoke"
              onsubmit="return confirm('Cancel the outstanding reset code?')">
        <button class="btn btn-danger btn-sm" type="submit">Cancel the outstanding code</button>
      </form>`
          : ''
      }

      <h3 class="section-label" style="margin-top:1.75rem">Reset history</h3>
      ${
        history.length
          ? `<ul class="trail">
        ${history
          .map(
            (reset) => `<li>
          <div class="top">
            <b>Issued ${esc(formatMoment(reset.issuedAt))}</b>
            ${stateBadge(reset)}
          </div>
          <p class="note">${esc(reset.note)}</p>
          ${reset.usedAt ? `<p class="when">Used ${esc(formatMoment(reset.usedAt))}</p>` : ''}
          ${reset.revokedAt ? `<p class="when">Cancelled ${esc(formatMoment(reset.revokedAt))}</p>` : ''}
        </li>`,
          )
          .join('')}
      </ul>`
          : '<p class="subtitle">No reset has ever been issued for this account.</p>'
      }
    </div>

    <aside>
      <div class="panel">
        <div class="who">
          <span class="avatar">${esc(initials(account.name))}</span>
          <div>
            <b>${esc(account.name)}</b>
            <span>${esc(account.email)}</span>
          </div>
        </div>

        <ul class="facts">
          <li><span>Joined</span>${esc(formatDay(account.createdAt))}</li>
          <li><span>Recovery code from</span>${esc(formatDay(account.recoveryIssuedAt ?? account.createdAt))}</li>
          <li><span>Certificates</span>${certificates}</li>
        </ul>
      </div>

      <div class="panel">
        <h3>What this does not do</h3>
        <p class="hint">
          You cannot read anybody's password or recovery code back to them —
          both are stored one-way, on purpose. A reset code is a fresh way in,
          and the learner picks the new password themselves.
        </p>
        <p class="hint" style="margin-top:.7rem">
          Their progress and certificates stay exactly as they are.
        </p>
      </div>
    </aside>
  </div>
${COPY_CODE_SCRIPT}`;

  return layout({
    title: `${account.name} — accounts`,
    body,
    nav: adminNav('/admin/accounts'),
    variant: 'admin',
    noindex: true,
  });
}
