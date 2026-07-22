export const ADMIN_CHROME_STYLES = `
  .page-title { font-family: var(--serif); font-size: 1.9rem; letter-spacing: -0.02em; }
  .back-link { font-size: 0.84rem; color: var(--ink-3); display: inline-block; margin-bottom: 0.4rem; }
  .back-link:hover { color: var(--accent); }
  .toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .toolbar .spacer { flex: 1; }
  .subtitle { font-size: 0.86rem; color: var(--ink-3); }
  .inline-form { display: inline; }
`;

export const ADMIN_PANEL_STYLES = `
  .panel {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.1rem; margin-bottom: 1.1rem;
  }
  .panel h3 {
    font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); margin-bottom: 0.85rem;
  }
  .field { margin-bottom: 1rem; }
  .field:last-child { margin-bottom: 0; }
  .field label { display: block; font-size: 0.82rem; margin-bottom: 0.3rem; color: var(--ink-2); }
  .hint { font-size: 0.76rem; color: var(--ink-3); margin-top: 0.3rem; }
  .form-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; align-items: start; }
  @media (max-width: 860px) { .form-grid { grid-template-columns: 1fr; } }
`;

export const ADMIN_ROW_STYLES = `
  .admin-row {
    display: flex; align-items: center; gap: 0.9rem;
    border: 1px solid var(--border); border-radius: 12px;
    padding: 0.9rem 1.1rem; margin-bottom: 0.6rem; background: var(--surface-2);
  }
  .admin-row .icon { font-size: 1.4rem; flex: none; }
  .admin-row .num {
    flex: none; width: 1.8rem; height: 1.8rem; border-radius: 100px;
    display: grid; place-items: center; font-size: 0.78rem;
    border: 1px solid var(--border); color: var(--ink-3);
  }
  .admin-row .info { flex: 1; min-width: 0; }
  .admin-row .info b { display: block; font-size: 0.96rem; }
  .admin-row .info span { font-size: 0.79rem; color: var(--ink-3); }
  .admin-row .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }

  .move {
    border: 1px solid var(--border); background: transparent; cursor: pointer;
    border-radius: 7px; width: 1.9rem; height: 1.9rem; line-height: 1;
    color: var(--ink-3); font-size: 0.85rem; font-family: inherit;
  }
  .move:hover { border-color: var(--accent); color: var(--accent); }
  .move[disabled] { opacity: 0.3; cursor: not-allowed; }
`;

export const ADMIN_STYLES = [
  ADMIN_CHROME_STYLES,
  ADMIN_PANEL_STYLES,
  ADMIN_ROW_STYLES,
].join('\n');
