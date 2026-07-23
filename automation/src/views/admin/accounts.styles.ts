import { ADMIN_STYLES } from '../shared/styles/admin.styles';
import { COPY_CODE_CSS } from '../shared/scripts/copy-code';

export const ACCOUNTS_ADMIN_STYLES = `
<style>
${ADMIN_STYLES}
${COPY_CODE_CSS}
  .acct-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th {
    text-align: left; font-size: 0.72rem; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--ink-3); font-weight: 700;
    padding: 0.6rem 0.7rem; border-bottom: 1px solid var(--border);
  }
  td { padding: 0.75rem 0.7rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:hover td { background: var(--surface-2); }
  td .t { color: var(--ink); font-weight: 600; display: block; }
  td .s { font-size: 0.8rem; color: var(--ink-3); display: block; }
  .col-actions { width: 1%; white-space: nowrap; text-align: right; }
  @media (max-width: 700px) { .acct-table-wrap table { min-width: 640px; } }

  .admin-search { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .admin-search input { flex: 1; min-width: 200px; border-radius: 100px; padding-left: 1rem; }
  .search-note { font-size: 0.85rem; color: var(--ink-3); margin-bottom: 0.85rem; }

  .state {
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 0.12rem 0.5rem; border-radius: 100px;
    border: 1px solid currentColor; white-space: nowrap;
  }
  .state-live { color: var(--warn); }
  .state-used { color: var(--good); }
  .state-revoked, .state-expired { color: var(--ink-3); }

  .issued {
    border: 1px solid var(--accent); border-radius: 12px; padding: 1.15rem;
    margin-bottom: 1.1rem;
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .issued h3 { font-size: 0.95rem; color: var(--ink); margin-bottom: 0.5rem; }
  .issued p { font-size: 0.84rem; color: var(--ink-2); line-height: 1.6; }
  .issued .code {
    font-family: var(--mono); font-size: 1.15rem; letter-spacing: 0.08em;
    color: var(--ink); text-align: center; word-break: break-word;
    padding: 0.9rem 0.6rem; margin: 0.9rem 0 0.5rem;
    background: var(--surface); border: 1px dashed var(--accent); border-radius: 10px;
  }
  .issued .link {
    font-family: var(--mono); font-size: 0.8rem; color: var(--ink-2);
    word-break: break-all; padding: 0.6rem 0.7rem; margin: 0.5rem 0;
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  }

  .who { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 1.25rem; }
  .who .avatar {
    flex: none; width: 2.8rem; height: 2.8rem; border-radius: 50%;
    display: grid; place-items: center; font-weight: 700;
    background: var(--accent); color: var(--accent-ink);
  }
  .who b { display: block; color: var(--ink); font-size: 1.05rem; }
  .who span { font-size: 0.84rem; color: var(--ink-3); }

  .facts { list-style: none; display: grid; gap: 0.55rem; }
  .facts li {
    display: flex; justify-content: space-between; gap: 1rem;
    font-size: 0.84rem; color: var(--ink-2);
  }
  .facts li span { color: var(--ink-3); }

  .trail { list-style: none; display: grid; gap: 0.5rem; }
  .trail li {
    border: 1px solid var(--border); border-radius: 10px;
    padding: 0.65rem 0.8rem; background: var(--surface-2);
  }
  .trail .top {
    display: flex; align-items: center; gap: 0.5rem;
    justify-content: space-between; flex-wrap: wrap;
  }
  .trail b { font-size: 0.82rem; color: var(--ink); }
  .trail .note { font-size: 0.82rem; color: var(--ink-2); margin-top: 0.35rem; }
  .trail .when { font-size: 0.76rem; color: var(--ink-3); }
</style>`;
