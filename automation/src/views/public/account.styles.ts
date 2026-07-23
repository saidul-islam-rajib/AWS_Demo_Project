export const ACCOUNT_STYLES = `
<style>
  .account-card { max-width: 26rem; padding: 2rem 0 3rem; }
  .account-card.wide { max-width: 34rem; }
  .account-card h1 {
    font-family: var(--serif); font-size: clamp(1.8rem, 4vw, 2.3rem);
    letter-spacing: -0.03em; margin-bottom: 0.5rem;
  }
  .account-lede { color: var(--ink-3); font-size: 0.94rem; margin-bottom: 1.5rem; }
  .account-error {
    border: 1px solid var(--danger); color: var(--danger);
    background: color-mix(in srgb, currentColor 8%, transparent);
    border-radius: 10px; padding: 0.7rem 0.9rem; font-size: 0.86rem;
    margin-bottom: 1.25rem;
  }
  .account-field { margin-bottom: 1.1rem; }
  .account-field label {
    display: block; font-size: 0.85rem; margin-bottom: 0.35rem; color: var(--ink-2);
  }
  .account-hint { font-size: 0.78rem; color: var(--ink-3); margin-top: 0.35rem; }
  .account-card button[type="submit"] { width: 100%; justify-content: center; }
  .account-alt {
    margin-top: 1.5rem; font-size: 0.88rem; color: var(--ink-3); text-align: center;
  }
  .account-alt a { color: var(--accent); font-weight: 600; }
  .account-section {
    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-3); margin: 2rem 0 0.9rem;
    padding-bottom: 0.6rem; border-bottom: 1px solid var(--border);
  }
  .account-cert {
    display: block; padding: 0.85rem 1rem; margin-bottom: 0.5rem;
    border: 1px solid var(--border); border-radius: 10px; background: var(--surface);
  }
  .account-cert:hover { border-color: var(--accent); }
  .account-cert b { display: block; font-size: 0.96rem; color: var(--ink); }
  .account-cert span { font-size: 0.79rem; color: var(--ink-3); }
  .account-empty { font-size: 0.88rem; color: var(--ink-3); }
  .account-signout { margin-top: 2rem; }
  .recovery-code {
    font-family: var(--mono); font-size: 1.25rem; letter-spacing: 0.08em;
    text-align: center; padding: 1.1rem; margin: 1.5rem 0;
    border: 1px dashed var(--accent); border-radius: 12px;
    color: var(--ink); word-break: break-all;
  }
</style>`;
