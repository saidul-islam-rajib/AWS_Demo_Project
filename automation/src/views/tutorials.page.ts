import {
  DIFFICULTY_LABELS,
  Neighbours,
  Subject,
  SubjectStats,
  Tutorial,
  formatDuration,
} from '../tutorials/tutorial.model';
import { readingMinutes } from '../posts/post.model';
import { esc, layout } from './layout';

const TUTORIALS_CSS = `
<style>
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

  .subj-grid {
    display: grid; gap: 1.1rem; margin: 2rem 0 3rem;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  }
  .subj-card {
    display: flex; flex-direction: column; gap: 0.75rem;
    border: 1px solid var(--border); border-radius: 14px;
    background: var(--surface); padding: 1.4rem;
    transition: border-color .18s, transform .18s;
  }
  .subj-card:hover { border-color: var(--accent); transform: translateY(-2px); }
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

  .crumbs {
    display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;
    font-size: 0.82rem; color: var(--ink-3); padding: 1.5rem 0 0.5rem;
  }
  .crumbs a { color: var(--ink-3); }
  .crumbs a:hover { color: var(--accent); }
  .crumbs .sep { opacity: 0.4; }

  .subj-head { padding: 0.5rem 0 1.75rem; border-bottom: 1px solid var(--border); }
  .subj-head .subj-icon { font-size: 2.4rem; margin-bottom: 0.6rem; }
  .subj-head h1 {
    font-family: var(--serif); font-size: clamp(1.9rem, 4.5vw, 2.6rem);
    letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 0.6rem;
  }
  .subj-head p { color: var(--ink-3); max-width: 38em; }
  .subj-head .progress-row { margin-top: 1.25rem; max-width: 420px; }

  .lesson-list { list-style: none; margin: 1.75rem 0 3rem; padding: 0; }
  .lesson-item {
    display: flex; gap: 1rem; align-items: flex-start;
    padding: 1rem; border: 1px solid var(--border); border-radius: 12px;
    margin-bottom: 0.6rem; background: var(--surface);
    transition: border-color .18s;
  }
  .lesson-item:hover { border-color: var(--accent); }
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
  .tut-nav .name { display: block; margin-top: 0.25rem; color: var(--ink-1); font-size: 0.95rem; }
  .tut-nav .next { text-align: right; grid-column: 2; }
  @media (max-width: 600px) { .tut-nav .next { text-align: left; grid-column: 1; } }

  .tut-empty {
    border: 1px dashed var(--border); border-radius: 12px;
    padding: 2.5rem 1.5rem; text-align: center; color: var(--ink-3);
  }
</style>`;

const PROGRESS_SCRIPT = `
<script>
(function () {
  var KEY = 'tutorial-progress';

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function write(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      return;
    }
  }

  var state = read();

  function isDone(id) {
    return state[id] === true;
  }

  function paintList() {
    var items = document.querySelectorAll('[data-lesson-id]');
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var done = isDone(el.getAttribute('data-lesson-id'));
      el.classList.toggle('done', done);
    }
  }

  function paintProgress() {
    var bars = document.querySelectorAll('[data-progress-for]');
    for (var i = 0; i < bars.length; i++) {
      var bar = bars[i];
      var ids = (bar.getAttribute('data-progress-for') || '').split(',').filter(Boolean);
      var total = ids.length;
      var done = 0;
      for (var j = 0; j < ids.length; j++) {
        if (isDone(ids[j])) done++;
      }
      var pct = total ? Math.round((done / total) * 100) : 0;
      var fill = bar.querySelector('.progress-fill');
      if (fill) fill.style.width = pct + '%';
      var label = bar.querySelector('[data-progress-label]');
      if (label) {
        label.textContent = total
          ? done + ' of ' + total + ' complete'
          : 'No lessons yet';
      }
    }
  }

  function paint() {
    paintList();
    paintProgress();
  }

  var button = document.querySelector('[data-mark-done]');
  if (button) {
    var id = button.getAttribute('data-mark-done');
    var sync = function () {
      var done = isDone(id);
      button.setAttribute('aria-pressed', done ? 'true' : 'false');
      var text = button.querySelector('[data-mark-label]');
      if (text) text.textContent = done ? 'Completed' : 'Mark as complete';
    };

    button.addEventListener('click', function () {
      if (isDone(id)) {
        delete state[id];
      } else {
        state[id] = true;
      }
      write(state);
      sync();
      paint();
    });

    sync();
  }

  paint();
})();
</script>`;

function levelBadge(level: string): string {
  return `<span class="level ${esc(level)}">${esc(DIFFICULTY_LABELS[level as keyof typeof DIFFICULTY_LABELS] ?? level)}</span>`;
}

function progressRow(ids: string[]): string {
  return `<div class="progress-row" data-progress-for="${esc(ids.join(','))}">
    <span class="progress-track"><span class="progress-fill"></span></span>
    <span data-progress-label>0 of ${ids.length} complete</span>
  </div>`;
}

export function tutorialsIndexPage(
  subjects: Subject[],
  stats: Map<string, SubjectStats>,
  lessonIds: Map<string, string[]>,
  totals: { subjects: number; tutorials: number; minutes: number },
): string {
  const cards = subjects
    .map((subject) => {
      const stat = stats.get(subject.id) ?? {
        total: 0,
        minutes: 0,
        difficulties: [],
      };
      const ids = lessonIds.get(subject.id) ?? [];

      return `<article class="subj-card">
        ${subject.icon ? `<div class="subj-icon">${esc(subject.icon)}</div>` : ''}
        <h2><a href="/tutorials/${esc(subject.slug)}">${esc(subject.title)}</a></h2>
        ${subject.summary ? `<p>${esc(subject.summary)}</p>` : ''}
        ${ids.length ? progressRow(ids) : ''}
        <div class="subj-meta">
          <span>${stat.total} ${stat.total === 1 ? 'lesson' : 'lessons'}</span>
          <span class="dot">·</span>
          <span>${esc(formatDuration(stat.minutes))}</span>
          ${stat.difficulties.length ? `<span class="dot">·</span>${stat.difficulties.map(levelBadge).join(' ')}` : ''}
        </div>
      </article>`;
    })
    .join('\n');

  const body = `
    <section class="tut-hero">
      <h1>Tutorials</h1>
      <p>Subject-by-subject walkthroughs, written in order. Pick a subject and work down it, or jump to whatever you need.</p>
      <div class="tut-totals">
        <div class="tut-total"><b>${totals.subjects}</b><span>Subjects</span></div>
        <div class="tut-total"><b>${totals.tutorials}</b><span>Lessons</span></div>
        <div class="tut-total"><b>${esc(formatDuration(totals.minutes))}</b><span>Reading time</span></div>
      </div>
    </section>

    ${
      subjects.length
        ? `<div class="subj-grid">${cards}</div>`
        : `<div class="tut-empty"><p>No subjects published yet.</p></div>`
    }
  `;

  return layout({
    title: 'Tutorials',
    description:
      'Subject-by-subject tutorials on backend development, DevOps and cloud infrastructure.',
    body,
    path: '/tutorials',
    head: TUTORIALS_CSS + PROGRESS_SCRIPT,
  });
}

export function subjectPage(
  subject: Subject,
  lessons: Tutorial[],
  stats: SubjectStats,
): string {
  const ids = lessons.map((lesson) => lesson.id);

  const items = lessons
    .map(
      (
        lesson,
        index,
      ) => `<li class="lesson-item" data-lesson-id="${esc(lesson.id)}">
        <span class="lesson-num"><span>${index + 1}</span></span>
        <div class="lesson-body">
          <h3><a href="/tutorials/${esc(subject.slug)}/${esc(lesson.slug)}">${esc(lesson.title)}</a></h3>
          ${lesson.summary ? `<p>${esc(lesson.summary)}</p>` : ''}
          <div class="lesson-meta">
            ${levelBadge(lesson.difficulty)}
            <span>${readingMinutes(lesson.content)} min read</span>
          </div>
        </div>
      </li>`,
    )
    .join('\n');

  const body = `
    <nav class="crumbs">
      <a href="/tutorials">Tutorials</a>
      <span class="sep">/</span>
      <span>${esc(subject.title)}</span>
    </nav>

    <header class="subj-head">
      ${subject.icon ? `<div class="subj-icon">${esc(subject.icon)}</div>` : ''}
      <h1>${esc(subject.title)}</h1>
      ${subject.summary ? `<p>${esc(subject.summary)}</p>` : ''}
      ${ids.length ? progressRow(ids) : ''}
    </header>

    ${
      lessons.length
        ? `<ol class="lesson-list">${items}</ol>`
        : `<div class="tut-empty" style="margin-top:2rem"><p>No lessons in this subject yet.</p></div>`
    }
  `;

  return layout({
    title: `${subject.title} tutorials`,
    description:
      subject.summary ||
      `${stats.total} tutorials on ${subject.title.toLowerCase()}.`,
    body,
    path: `/tutorials/${subject.slug}`,
    head: TUTORIALS_CSS + PROGRESS_SCRIPT,
  });
}

export function tutorialPage(
  subject: Subject,
  tutorial: Tutorial,
  lessons: Tutorial[],
  nav: Neighbours,
  contentHtml: string,
): string {
  const sidebar = lessons
    .map(
      (lesson) =>
        `<li><a data-lesson-id="${esc(lesson.id)}" class="${lesson.id === tutorial.id ? 'current' : ''}" href="/tutorials/${esc(subject.slug)}/${esc(lesson.slug)}">${esc(lesson.title)}</a></li>`,
    )
    .join('\n');

  const previous = nav.previous
    ? `<a class="prev" href="/tutorials/${esc(subject.slug)}/${esc(nav.previous.slug)}">
        <span class="dir">Previous</span>
        <span class="name">${esc(nav.previous.title)}</span>
      </a>`
    : '<span></span>';

  const next = nav.next
    ? `<a class="next" href="/tutorials/${esc(subject.slug)}/${esc(nav.next.slug)}">
        <span class="dir">Next</span>
        <span class="name">${esc(nav.next.title)}</span>
      </a>`
    : '';

  const body = `
    <nav class="crumbs">
      <a href="/tutorials">Tutorials</a>
      <span class="sep">/</span>
      <a href="/tutorials/${esc(subject.slug)}">${esc(subject.title)}</a>
      <span class="sep">/</span>
      <span>${esc(tutorial.title)}</span>
    </nav>

    <div class="tut-layout">
      <aside class="tut-side">
        <h4>${esc(subject.title)}</h4>
        <ol>${sidebar}</ol>
      </aside>

      <article class="tut-article">
        <h1>${esc(tutorial.title)}</h1>
        ${tutorial.summary ? `<p class="lede">${esc(tutorial.summary)}</p>` : ''}
        <div class="tut-article-meta">
          <span>Lesson ${nav.position} of ${nav.total}</span>
          <span class="dot">·</span>
          ${levelBadge(tutorial.difficulty)}
          <span>${readingMinutes(tutorial.content)} min read</span>
        </div>

        <div class="prose">${contentHtml}</div>

        <p style="margin-top:2rem">
          <button type="button" class="mark-done" data-mark-done="${esc(tutorial.id)}" aria-pressed="false">
            <span class="tick">✓</span><span data-mark-label>Mark as complete</span>
          </button>
        </p>

        <nav class="tut-nav">
          ${previous}
          ${next}
        </nav>
      </article>
    </div>
  `;

  return layout({
    title: tutorial.title,
    description: tutorial.summary || `${subject.title} tutorial.`,
    body,
    path: `/tutorials/${subject.slug}/${tutorial.slug}`,
    ogType: 'article',
    publishedAt: tutorial.createdAt,
    head: TUTORIALS_CSS + PROGRESS_SCRIPT,
  });
}
