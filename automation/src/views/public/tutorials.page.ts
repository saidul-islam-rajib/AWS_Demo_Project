import {
  ChapterGroup,
  DIFFICULTY_LABELS,
  Neighbours,
  Subject,
  SubjectStats,
  Tutorial,
  formatDuration,
} from '../../tutorials/tutorial.model';
import { readingMinutes } from '../../posts/post.model';
import { esc, layout } from '../shared/layout';
import {
  badge,
  breadcrumbs,
  emptyState,
  metaSeparator,
  pluralise,
  progressBar,
} from '../shared/components';
import { PROGRESS_TRACKER_SCRIPT } from '../shared/scripts/progress-tracker';
import { TUTORIALS_STYLES } from './tutorials.styles';

const HEAD = TUTORIALS_STYLES;

function levelBadge(level: string): string {
  return badge(
    DIFFICULTY_LABELS[level as keyof typeof DIFFICULTY_LABELS] ?? level,
    level,
  );
}

function levelRange(levels: string[]): string {
  if (levels.length === 0) return '';
  if (levels.length === 1) return levelBadge(levels[0]);

  const lowest = levels[0];
  const highest = levels[levels.length - 1];
  const label = `${DIFFICULTY_LABELS[lowest as keyof typeof DIFFICULTY_LABELS]}–${DIFFICULTY_LABELS[highest as keyof typeof DIFFICULTY_LABELS]}`;

  return badge(label, lowest);
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
        ${ids.length ? progressBar(ids) : ''}
        <div class="subj-meta">
          <span>${stat.total} ${pluralise(stat.total, 'lesson')}</span>
          ${metaSeparator()}
          <span>${esc(formatDuration(stat.minutes))}</span>
          ${stat.difficulties.length ? `${metaSeparator()}${levelRange(stat.difficulties)}` : ''}
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
        : emptyState('No subjects published yet.')
    }
  `;

  return layout({
    title: 'Tutorials',
    description:
      'Subject-by-subject tutorials on backend development, DevOps and cloud infrastructure.',
    body: body + PROGRESS_TRACKER_SCRIPT,
    path: '/tutorials',
    head: HEAD,
  });
}

export function subjectPage(
  subject: Subject,
  groups: ChapterGroup[],
  stats: SubjectStats,
): string {
  const ids = groups.flatMap((group) => group.lessons.map((l) => l.id));

  let position = 0;

  const sections = groups
    .filter((group) => group.lessons.length)
    .map((group) => {
      const items = group.lessons
        .map((lesson) => {
          position += 1;

          return `<li class="lesson-item" data-lesson-id="${esc(lesson.id)}">
            <span class="lesson-num"><span>${position}</span></span>
            <div class="lesson-body">
              <h3><a href="/tutorials/${esc(subject.slug)}/${esc(lesson.slug)}">${esc(lesson.title)}</a></h3>
              ${lesson.summary ? `<p>${esc(lesson.summary)}</p>` : ''}
              <div class="lesson-meta">
                ${levelBadge(lesson.difficulty)}
                <span>${readingMinutes(lesson.content)} min read</span>
              </div>
            </div>
          </li>`;
        })
        .join('\n');

      return `<section class="chapter">
        ${
          group.chapter
            ? `<header class="chapter-head">
                 <h2>${esc(group.chapter.title)}</h2>
                 ${group.chapter.summary ? `<p>${esc(group.chapter.summary)}</p>` : ''}
                 <span class="chapter-count">${group.lessons.length} ${pluralise(group.lessons.length, 'lesson')}</span>
               </header>`
            : ''
        }
        <ol class="lesson-list">${items}</ol>
      </section>`;
    })
    .join('\n');

  const body = `
    ${breadcrumbs([
      { label: 'Tutorials', href: '/tutorials' },
      { label: subject.title },
    ])}

    <header class="subj-head">
      ${subject.icon ? `<div class="subj-icon">${esc(subject.icon)}</div>` : ''}
      <h1>${esc(subject.title)}</h1>
      ${subject.summary ? `<p>${esc(subject.summary)}</p>` : ''}
      ${ids.length ? progressBar(ids) : ''}
    </header>

    ${
      ids.length
        ? sections
        : emptyState('No lessons in this subject yet.', 'margin-top:2rem')
    }
  `;

  return layout({
    title: `${subject.title} tutorials`,
    description:
      subject.summary ||
      `${stats.total} tutorials on ${subject.title.toLowerCase()}.`,
    body: body + PROGRESS_TRACKER_SCRIPT,
    path: `/tutorials/${subject.slug}`,
    head: HEAD,
  });
}

export function tutorialPage(
  subject: Subject,
  tutorial: Tutorial,
  groups: ChapterGroup[],
  nav: Neighbours,
  contentHtml: string,
): string {
  const sidebar = groups
    .filter((group) => group.lessons.length)
    .map((group) => {
      const items = group.lessons
        .map(
          (lesson) =>
            `<li><a data-lesson-id="${esc(lesson.id)}" class="${lesson.id === tutorial.id ? 'current' : ''}" href="/tutorials/${esc(subject.slug)}/${esc(lesson.slug)}">${esc(lesson.title)}</a></li>`,
        )
        .join('\n');

      return group.chapter
        ? `<li class="side-chapter">${esc(group.chapter.title)}</li>${items}`
        : items;
    })
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
    ${breadcrumbs([
      { label: 'Tutorials', href: '/tutorials' },
      { label: subject.title, href: `/tutorials/${subject.slug}` },
      { label: tutorial.title },
    ])}

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
          ${metaSeparator()}
          ${levelBadge(tutorial.difficulty)}
          <span>${readingMinutes(tutorial.content)} min read</span>
        </div>

        <div class="prose">${contentHtml}</div>

        <div class="lesson-end" data-lesson-end aria-hidden="true"></div>

        <div class="lesson-status">
          <button type="button" class="mark-done" data-mark-done="${esc(tutorial.id)}" aria-pressed="false">
            <span class="tick">✓</span><span data-mark-label>Mark as complete</span>
          </button>
          <span class="auto-note" data-auto-note>Marked automatically once you reach the end.</span>
        </div>

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
    body: body + PROGRESS_TRACKER_SCRIPT,
    path: `/tutorials/${subject.slug}/${tutorial.slug}`,
    ogType: 'article',
    publishedAt: tutorial.createdAt,
    head: HEAD,
  });
}
