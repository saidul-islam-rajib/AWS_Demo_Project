export const CERTIFICATE_STYLES = `
<style>
  .cert-form { max-width: 34rem; padding: 1.5rem 0 3rem; }
  .cert-form h1 {
    font-family: var(--serif); font-size: clamp(1.8rem, 4vw, 2.4rem);
    letter-spacing: -0.03em; margin-bottom: 0.6rem;
  }
  .cert-lede { color: var(--ink-3); margin-bottom: 1.5rem; }
  .cert-incomplete {
    border: 1px solid var(--warn); color: var(--warn);
    background: color-mix(in srgb, currentColor 8%, transparent);
    border-radius: 10px; padding: 0.7rem 0.9rem; font-size: 0.86rem;
    margin-bottom: 1.25rem;
  }
  .cert-incomplete a { color: inherit; text-decoration: underline; }
  .cert-incomplete[hidden] { display: none; }
  .cert-field { margin-bottom: 1.1rem; }
  .cert-field label {
    display: block; font-size: 0.85rem; margin-bottom: 0.35rem; color: var(--ink-2);
  }
  .cert-optional {
    font-size: 0.75rem; color: var(--ink-3); font-weight: 400; margin-left: 0.3rem;
  }
  .cert-hint { font-size: 0.78rem; color: var(--ink-3); margin-top: 0.35rem; }

  .cert-actions {
    display: flex; gap: 0.6rem; flex-wrap: wrap; padding: 1.5rem 0 1.25rem;
  }

  .cert {
    border: 2px solid var(--accent); border-radius: 16px;
    padding: 3rem 2rem; text-align: center; background: var(--surface);
  }
  .cert-kicker {
    font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.18em;
    color: var(--accent); font-weight: 700; margin-bottom: 2rem;
  }
  .cert-awarded { font-size: 0.9rem; color: var(--ink-3); }
  .cert-holder {
    font-family: var(--serif); font-size: clamp(1.9rem, 5vw, 2.8rem);
    line-height: 1.15; margin: 0.5rem 0 0.25rem; color: var(--ink);
  }
  .cert-contact { font-size: 0.82rem; color: var(--ink-3); margin-bottom: 1.5rem; }
  .cert-holder + .cert-awarded { margin-top: 1.5rem; }
  .cert-course {
    font-family: var(--serif); font-size: clamp(1.4rem, 3.5vw, 2rem);
    margin: 0.4rem 0 0.75rem; color: var(--accent);
  }
  .cert-detail { font-size: 0.86rem; color: var(--ink-3); }
  .cert-foot {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 2.5rem;
    margin-top: 2.5rem; padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    font-size: 0.84rem;
  }
  .cert-foot div { display: flex; flex-direction: column; gap: 0.2rem; }
  .cert-foot-label {
    font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-3);
  }
  .cert-note {
    margin: 1.25rem 0 3rem; font-size: 0.78rem; color: var(--ink-3);
    text-align: center; max-width: 34rem; margin-left: auto; margin-right: auto;
  }

  @media print {
    .site-header, .site-footer, .cert-actions, .cert-note { display: none; }
    .cert {
      border-color: #000; box-shadow: none; page-break-inside: avoid;
      padding: 3.5rem 2.5rem;
    }
    .cert-kicker, .cert-course { color: #000; }
  }
</style>`;
