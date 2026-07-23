import { COMPONENT_STYLES } from '../shared/styles/components.styles';

const LAYOUT_STYLES = `
  .tut-hero { padding: 2rem 0 1.5rem; }
  .tut-hero h1 {
    font-family: var(--serif); font-size: clamp(2rem, 5vw, 2.9rem);
    line-height: 1.08; letter-spacing: -0.03em; margin-bottom: 0.7rem;
  }
  .tut-hero p { color: var(--ink-3); max-width: 36em; font-size: 1.04rem; }
  .tut-totals {
    display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1.25rem;
    padding-top: 1.25rem; border-top: 1px solid var(--border);
  }
  .tut-total b { display: block; font-size: 1.5rem; font-family: var(--serif); }
  .tut-total span { font-size: 0.8rem; color: var(--ink-3); }
`;

const SUBJECT_STYLES = `
  .subj-grid {
    display: grid; gap: 1.1rem; margin: 2rem 0 3rem;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  }
  .subj-card {
    position: relative;
    display: flex; flex-direction: column; gap: 0.75rem;
    border: 1px solid var(--border); border-radius: 14px;
    background: var(--surface); padding: 1.4rem;
    transition: border-color .18s, transform .18s;
  }
  .subj-card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .subj-card:focus-within { border-color: var(--accent); }
  .subj-card h2 a::after { content: ""; position: absolute; inset: 0; border-radius: 14px; }
  .subj-icon { font-size: 1.9rem; line-height: 1; }
  .subj-card h2 {
    font-family: var(--serif); font-size: 1.35rem; letter-spacing: -0.02em;
  }
  .subj-card h2 a { color: inherit; }
  .subj-card p { color: var(--ink-3); font-size: 0.92rem; line-height: 1.55; }
  .subj-meta {
    display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center;
    font-size: 0.78rem; color: var(--ink-3); margin-top: auto;
    padding-top: 0.75rem; border-top: 1px solid var(--border);
  }
  .subj-meta .dot { opacity: 0.4; }

  .subj-head { padding: 0.5rem 0 1.75rem; border-bottom: 1px solid var(--border); }
  .subj-head .subj-icon { font-size: 2.4rem; margin-bottom: 0.6rem; }
  .subj-head h1 {
    font-family: var(--serif); font-size: clamp(1.9rem, 4.5vw, 2.6rem);
    letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 0.6rem;
  }
  .subj-head p { color: var(--ink-3); max-width: 38em; }
  .subj-head .progress-row { margin-top: 1.25rem; max-width: 420px; }
  .resume {
    display: inline-flex; align-items: center; gap: 0.5rem;
    margin-top: 1.1rem; padding: 0.65rem 1.35rem; border-radius: 100px;
    background: var(--accent); color: var(--accent-ink);
    font-size: 0.92rem; font-weight: 600;
  }
  .resume:hover { filter: brightness(1.08); }
  .resume.done { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
  .chapter-count.complete { color: var(--accent); font-weight: 700; }
`;

const ENROL_STYLES = `
  .enrol-card {
    border: 1px solid var(--border); border-radius: 14px;
    background: var(--surface-2); padding: 1.5rem; margin-top: 1.75rem;
  }
  .enrol-card h2 {
    font-family: var(--serif); font-size: 1.3rem; margin-bottom: 0.5rem;
  }
  .enrol-card p { color: var(--ink-3); font-size: 0.92rem; max-width: 40em; }
  .enrol-card form {
    display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;
  }
  .enrol-card input {
    flex: 1; min-width: 220px; border-radius: 100px; padding-left: 1rem;
  }
  .enrol-error { color: var(--danger); font-weight: 600; margin-top: 0.6rem; }
  .enrol-note { margin-top: 0.9rem; font-size: 0.79rem; color: var(--ink-3); }
  .lesson-item.locked { opacity: 0.75; }
  .lesson-item.locked:hover { border-color: var(--border); }
  .locked-title { color: var(--ink-2); }
  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  }
`;

const LESSON_LIST_STYLES = `
  .chapter { margin-top: 2.25rem; }
  .chapter:first-of-type { margin-top: 1.75rem; }
  .chapter-head {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.6rem;
    padding-bottom: 0.6rem; margin-bottom: 0.9rem;
    border-bottom: 1px solid var(--border);
  }
  .chapter-head h2 {
    font-family: var(--serif); font-size: 1.25rem; letter-spacing: -0.02em;
  }
  .chapter-head p {
    flex-basis: 100%; order: 3;
    font-size: 0.88rem; color: var(--ink-3); line-height: 1.5;
  }
  .chapter-count {
    margin-left: auto; font-size: 0.76rem; color: var(--ink-3);
    white-space: nowrap;
  }

  .lesson-list { list-style: none; margin: 0 0 1rem; padding: 0; }
  .lesson-item {
    position: relative;
    display: flex; gap: 1rem; align-items: flex-start;
    padding: 1rem; border: 1px solid var(--border); border-radius: 12px;
    margin-bottom: 0.6rem; background: var(--surface);
    transition: border-color .18s;
  }
  .lesson-item:hover { border-color: var(--accent); }
  .lesson-item:focus-within { border-color: var(--accent); }
  .lesson-body h3 a::after { content: ""; position: absolute; inset: 0; border-radius: 12px; }
  .lesson-item.done { border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); }
  .lesson-num {
    flex: none; width: 2rem; height: 2rem; border-radius: 100px;
    display: grid; place-items: center; font-size: 0.82rem;
    border: 1px solid var(--border); color: var(--ink-3);
  }
  .lesson-item.done .lesson-num {
    background: var(--accent); border-color: var(--accent); color: var(--accent-ink);
  }
  .lesson-item.done .lesson-num::after { content: "✓"; }
  .lesson-item.done .lesson-num span { display: none; }
  .lesson-body { flex: 1; min-width: 0; }
  .lesson-body h3 { font-size: 1.02rem; margin-bottom: 0.25rem; }
  .lesson-body h3 a { color: inherit; }
  .lesson-body p { font-size: 0.88rem; color: var(--ink-3); line-height: 1.5; }
  .lesson-meta {
    display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
    margin-top: 0.5rem; font-size: 0.76rem; color: var(--ink-3);
  }
`;

const LESSON_PAGE_STYLES = `
  .tut-layout { display: grid; grid-template-columns: 260px 1fr; gap: 3rem; align-items: start; }
  @media (max-width: 900px) { .tut-layout { grid-template-columns: 1fr; gap: 1.5rem; } }

  .tut-side {
    position: sticky; top: 5rem; border: 1px solid var(--border);
    border-radius: 12px; padding: 1.1rem; background: var(--surface);
  }
  @media (max-width: 900px) { .tut-side { position: static; } }
  .tut-side h4 {
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-3); margin-bottom: 0.75rem;
  }
  .tut-side ol { list-style: none; margin: 0; padding: 0; counter-reset: lesson; }
  .tut-side li { counter-increment: lesson; }
  .tut-side li a {
    display: flex; gap: 0.5rem; align-items: baseline;
    padding: 0.4rem 0.5rem; border-radius: 7px; font-size: 0.86rem;
    color: var(--ink-2); line-height: 1.4;
  }
  .tut-side li a::before {
    content: counter(lesson) "."; flex: none; font-size: 0.74rem;
    color: var(--ink-3); min-width: 1.2em;
  }
  .tut-side li a:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); color: var(--accent); }
  .tut-side li a.current { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); font-weight: 600; }
  .tut-side li.side-chapter {
    counter-reset: none; list-style: none;
    font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); font-weight: 700;
    margin: 0.9rem 0 0.35rem; padding: 0 0.5rem;
  }
  .tut-side li.side-chapter:first-child { margin-top: 0; }
  .tut-side li a.done::after { content: "✓"; margin-left: auto; color: var(--accent); font-size: 0.8rem; }

  .tut-article h1 {
    font-family: var(--serif); font-size: clamp(1.8rem, 4vw, 2.5rem);
    line-height: 1.12; letter-spacing: -0.03em; margin-bottom: 0.6rem;
  }
  .tut-article .lede { color: var(--ink-3); font-size: 1.02rem; margin-bottom: 1rem; }
  .tut-article-meta {
    display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center;
    font-size: 0.8rem; color: var(--ink-3);
    padding-bottom: 1.25rem; margin-bottom: 1.75rem;
    border-bottom: 1px solid var(--border);
  }
  .tut-article-meta .dot { opacity: 0.4; }

  .lesson-end { height: 1px; margin-top: -1px; }

  .lesson-status {
    display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;
    margin-top: 2rem;
  }
  .mark-done {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.6rem 1.1rem; border-radius: 100px; cursor: pointer;
    border: 1px solid var(--accent); background: transparent;
    color: var(--accent); font-size: 0.88rem; font-family: inherit;
    transition: background .18s, color .18s;
  }
  .mark-done:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .mark-done[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }
  .mark-done .tick { font-size: 0.9rem; }

  .tut-nav {
    display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
    margin-top: 2.5rem; padding-top: 1.75rem; border-top: 1px solid var(--border);
  }
  @media (max-width: 600px) { .tut-nav { grid-template-columns: 1fr; } }
  .tut-nav a {
    border: 1px solid var(--border); border-radius: 12px; padding: 0.9rem 1.1rem;
    display: block; transition: border-color .18s;
  }
  .tut-nav a:hover { border-color: var(--accent); }
  .tut-nav .dir { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-3); }
  .tut-nav .name { display: block; margin-top: 0.25rem; color: var(--ink); font-size: 0.95rem; }
  .tut-nav .next { text-align: right; grid-column: 2; }
  @media (max-width: 600px) { .tut-nav .next { text-align: left; grid-column: 1; } }
`;

export const TUTORIALS_STYLES = `
<style>
${COMPONENT_STYLES}
${LAYOUT_STYLES}
${SUBJECT_STYLES}
${ENROL_STYLES}
${LESSON_LIST_STYLES}
${LESSON_PAGE_STYLES}
</style>`;
