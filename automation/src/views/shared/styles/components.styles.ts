export const BADGE_STYLES = `
  .level {
    display: inline-block; font-size: 0.68rem; text-transform: uppercase;
    letter-spacing: 0.06em; padding: 0.2rem 0.5rem; border-radius: 100px;
    border: 1px solid var(--border); color: var(--ink-3);
  }
  .level.beginner { border-color: color-mix(in srgb, var(--accent) 45%, transparent); color: var(--accent); }
  .level.intermediate { border-color: color-mix(in srgb, #d97706 55%, transparent); color: #b45309; }
  .level.advanced { border-color: color-mix(in srgb, #dc2626 55%, transparent); color: #b91c1c; }
  @media (prefers-color-scheme: dark) {
    .level.intermediate { color: #fbbf24; }
    .level.advanced { color: #f87171; }
  }

  .pill {
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem; border-radius: 100px; font-weight: 700;
    border: 1px solid currentColor; white-space: nowrap;
  }
  .pill.pub { color: var(--good); }
  .pill.draft { color: var(--warn); }
`;

export const PROGRESS_STYLES = `
  .progress-track {
    height: 6px; border-radius: 100px; background: var(--border);
    overflow: hidden; flex: 1; min-width: 80px;
  }
  .progress-fill {
    display: block; height: 100%; width: 0%; border-radius: 100px;
    background: var(--accent); transition: width .35s ease;
  }
  .progress-row {
    display: flex; align-items: center; gap: 0.75rem;
    font-size: 0.78rem; color: var(--ink-3);
  }
`;

export const BREADCRUMB_STYLES = `
  .crumbs {
    display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;
    font-size: 0.82rem; color: var(--ink-3); padding: 1.5rem 0 0.5rem;
  }
  .crumbs a { color: var(--ink-3); }
  .crumbs a:hover { color: var(--accent); }
  .crumbs .sep { opacity: 0.4; }
`;

export const EMPTY_STATE_STYLES = `
  .empty-state {
    border: 1px dashed var(--border); border-radius: 12px;
    padding: 2.5rem 1.5rem; text-align: center; color: var(--ink-3);
  }
`;

export const COMPONENT_STYLES = [
  BADGE_STYLES,
  PROGRESS_STYLES,
  BREADCRUMB_STYLES,
  EMPTY_STATE_STYLES,
].join('\n');
