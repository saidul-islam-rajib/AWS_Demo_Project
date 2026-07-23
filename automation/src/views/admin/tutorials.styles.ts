import { ADMIN_STYLES } from '../shared/styles/admin.styles';
import {
  BADGE_STYLES,
  EMPTY_STATE_STYLES,
} from '../shared/styles/components.styles';

const SUBJECT_ROW_STYLES = `
  .subj-row {
    display: flex; align-items: center; gap: 0.9rem;
    border: 1px solid var(--border); border-radius: 12px;
    padding: 0.9rem 1.1rem; margin-bottom: 0.6rem; background: var(--surface-2);
  }
  .subj-row .icon { font-size: 1.4rem; flex: none; }
  .subj-row .info { flex: 1; min-width: 0; }
  .subj-row .info b { display: block; font-size: 0.98rem; }
  .subj-row .info span { font-size: 0.8rem; color: var(--ink-3); }
  .subj-row .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }

  .lesson-row {
    display: flex; align-items: center; gap: 0.9rem;
    border: 1px solid var(--border); border-radius: 10px;
    padding: 0.75rem 0.9rem; margin-bottom: 0.5rem; background: var(--surface-2);
  }
  .lesson-row .num {
    flex: none; width: 1.8rem; height: 1.8rem; border-radius: 100px;
    display: grid; place-items: center; font-size: 0.78rem;
    border: 1px solid var(--border); color: var(--ink-3);
  }
  .lesson-row .info { flex: 1; min-width: 0; }
  .lesson-row .info b { display: block; font-size: 0.92rem; }
  .lesson-row .info span { font-size: 0.78rem; color: var(--ink-3); }
  .lesson-row .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }

  [data-sort-id] { cursor: grab; }
  [data-sort-id]:active { cursor: grabbing; }
  [data-sort-id].dragging { opacity: 0.45; border-style: dashed; border-color: var(--accent); }
  [data-sort-id] a, [data-sort-id] button { cursor: pointer; }

  .grip {
    flex: none; color: var(--ink-3); font-size: 1rem; line-height: 1;
    letter-spacing: -2px; user-select: none;
  }
  .grip:hover { color: var(--accent); }

  .sort-hint { font-size: 0.78rem; color: var(--ink-3); margin-bottom: 0.75rem; }

  .chapter-block { margin-bottom: 1.5rem; }
  .chapter-bar {
    display: flex; align-items: center; gap: 0.9rem;
    padding: 0.6rem 0.9rem; margin-bottom: 0.6rem;
    border-left: 3px solid var(--accent); background: transparent;
  }
  .chapter-bar.loose { border-left-color: var(--border); }
  .chapter-bar .info { flex: 1; min-width: 0; }
  .chapter-bar .info b {
    display: block; font-size: 0.8rem; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--ink);
  }
  .chapter-bar .info span { font-size: 0.78rem; color: var(--ink-3); }
  .chapter-bar .actions { display: flex; gap: 0.35rem; align-items: center; }
  .chapter-block .lesson-row { margin-left: 1.1rem; }


`;

export const TUTORIALS_ADMIN_STYLES = `
<style>
${ADMIN_STYLES}
${BADGE_STYLES}
${EMPTY_STATE_STYLES}
${SUBJECT_ROW_STYLES}
</style>`;
