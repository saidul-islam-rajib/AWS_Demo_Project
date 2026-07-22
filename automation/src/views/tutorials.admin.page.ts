import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  Subject,
  SubjectStats,
  Tutorial,
  formatDuration,
} from '../tutorials/tutorial.model';
import { readingMinutes } from '../posts/post.model';
import { adminNav, esc, layout } from './layout';

const CSS = `
<style>
  .page-title { font-family: var(--serif); font-size: 1.9rem; letter-spacing: -0.02em; }
  .back-link { font-size: 0.84rem; color: var(--ink-3); display: inline-block; margin-bottom: 0.4rem; }
  .back-link:hover { color: var(--accent); }
  .toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .toolbar .spacer { flex: 1; }

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

  .pill {
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem; border-radius: 100px; font-weight: 700;
    border: 1px solid currentColor; white-space: nowrap;
  }
  .pill.pub { color: var(--good); }
  .pill.draft { color: var(--warn); }

  .move {
    border: 1px solid var(--border); background: transparent; cursor: pointer;
    border-radius: 7px; width: 1.9rem; height: 1.9rem; line-height: 1;
    color: var(--ink-3); font-size: 0.85rem; font-family: inherit;
  }
  .move:hover { border-color: var(--accent); color: var(--accent); }
  .move[disabled] { opacity: 0.3; cursor: not-allowed; }

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

  .empty {
    border: 1px dashed var(--border); border-radius: 12px;
    padding: 2rem 1.5rem; text-align: center; color: var(--ink-3);
  }
  .inline-form { display: inline; }
</style>`;

function statusPill(status: string): string {
  return status === 'draft'
    ? '<span class="pill draft">Draft</span>'
    : '<span class="pill pub">Published</span>';
}

export function tutorialsAdminPage(
  subjects: Subject[],
  stats: Map<string, SubjectStats>,
  drafts: Map<string, number>,
): string {
  const rows = subjects
    .map((subject, index) => {
      const stat = stats.get(subject.id) ?? {
        total: 0,
        minutes: 0,
        difficulties: [],
      };
      const draftCount = drafts.get(subject.id) ?? 0;

      return `<div class="subj-row">
        <span class="icon">${subject.icon ? esc(subject.icon) : '📘'}</span>
        <div class="info">
          <b>${esc(subject.title)}</b>
          <span>
            ${stat.total} published${draftCount ? ` · ${draftCount} draft` : ''}
            · ${esc(formatDuration(stat.minutes))}
            · /tutorials/${esc(subject.slug)}
          </span>
        </div>
        ${statusPill(subject.status)}
        <div class="actions">
          <form class="inline-form" method="post" action="/admin/tutorials/subjects/${esc(subject.id)}/move">
            <input type="hidden" name="direction" value="up" />
            <button class="move" type="submit" title="Move up" ${index === 0 ? 'disabled' : ''}>↑</button>
          </form>
          <form class="inline-form" method="post" action="/admin/tutorials/subjects/${esc(subject.id)}/move">
            <input type="hidden" name="direction" value="down" />
            <button class="move" type="submit" title="Move down" ${index === subjects.length - 1 ? 'disabled' : ''}>↓</button>
          </form>
          <a class="btn btn-sm" href="/admin/tutorials/subjects/${esc(subject.id)}">Lessons</a>
          <a class="btn btn-sm" href="/admin/tutorials/subjects/${esc(subject.id)}/edit">Edit</a>
        </div>
      </div>`;
    })
    .join('\n');

  const body = `
${CSS}
  <div class="toolbar">
    <div>
      <h1 class="page-title" style="margin-bottom:.15rem">Tutorials</h1>
      <p style="font-size:.86rem;color:var(--ink-3)">Subjects hold ordered lessons. Drag order is set with the arrows.</p>
    </div>
    <div class="spacer"></div>
    <a class="btn btn-primary" href="/admin/tutorials/subjects/new">New subject</a>
  </div>

  ${subjects.length ? rows : '<div class="empty"><p>No subjects yet. Create one to start adding lessons.</p></div>'}
`;

  return layout({
    title: 'Tutorials · Admin',
    body,
    nav: adminNav('/admin/tutorials'),
    variant: 'admin',
    path: '/admin/tutorials',
    noindex: true,
  });
}

export function subjectEditorPage(subject?: Subject): string {
  const editing = Boolean(subject);
  const action = editing
    ? `/admin/tutorials/subjects/${esc(subject!.id)}/edit`
    : '/admin/tutorials/subjects/new';

  const v = (value?: string) => esc(value ?? '');

  const body = `
${CSS}
  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin/tutorials">← Back to tutorials</a>
      <h1 class="page-title" style="margin-bottom:.15rem">${editing ? 'Edit subject' : 'New subject'}</h1>
    </div>
  </div>

  <form method="post" action="${action}">
    <div class="form-grid">
      <div>
        <div class="panel">
          <h3>Basics</h3>
          <div class="field">
            <label for="title">Title</label>
            <input type="text" id="title" name="title" required value="${v(subject?.title)}"
                   placeholder="Networking" />
          </div>
          <div class="field">
            <label for="summary">Summary</label>
            <textarea id="summary" name="summary" rows="3"
                      placeholder="One or two sentences describing what this subject covers.">${v(subject?.summary)}</textarea>
          </div>
          <div class="field">
            <label for="icon">Icon</label>
            <input type="text" id="icon" name="icon" maxlength="4" value="${v(subject?.icon)}"
                   placeholder="🌐" style="max-width:6rem" />
            <p class="hint">A single emoji, shown on the subject card.</p>
          </div>
        </div>
      </div>

      <div>
        <div class="panel">
          <h3>Publishing</h3>
          <div class="field">
            <label for="status">Status</label>
            <select id="status" name="status">
              <option value="published" ${subject?.status !== 'draft' ? 'selected' : ''}>Published</option>
              <option value="draft" ${subject?.status === 'draft' ? 'selected' : ''}>Draft</option>
            </select>
            <p class="hint">A draft subject and all its lessons stay hidden from the public site.</p>
          </div>
          <button class="btn btn-primary" type="submit" style="width:100%">
            ${editing ? 'Save subject' : 'Create subject'}
          </button>
        </div>

        ${
          editing
            ? `<div class="panel">
                <h3>Danger zone</h3>
                <p class="hint" style="margin-bottom:.75rem">Deleting a subject also deletes every lesson inside it.</p>
              </div>`
            : ''
        }
      </div>
    </div>
  </form>

  ${
    editing
      ? `<form method="post" action="/admin/tutorials/subjects/${esc(subject!.id)}/delete"
              onsubmit="return confirm('Delete this subject and every lesson in it? This cannot be undone.')">
          <button class="btn btn-danger" type="submit">Delete subject</button>
        </form>`
      : ''
  }
`;

  return layout({
    title: editing ? 'Edit subject · Admin' : 'New subject · Admin',
    body,
    nav: adminNav('/admin/tutorials'),
    variant: 'admin',
    path: '/admin/tutorials',
    noindex: true,
  });
}

export function subjectLessonsPage(
  subject: Subject,
  lessons: Tutorial[],
): string {
  const rows = lessons
    .map(
      (lesson, index) => `<div class="lesson-row">
        <span class="num">${index + 1}</span>
        <div class="info">
          <b>${esc(lesson.title)}</b>
          <span>
            ${esc(DIFFICULTY_LABELS[lesson.difficulty])}
            · ${readingMinutes(lesson.content)} min
            · ${lesson.views} view${lesson.views === 1 ? '' : 's'}
          </span>
        </div>
        ${statusPill(lesson.status)}
        <div class="actions">
          <form class="inline-form" method="post" action="/admin/tutorials/lessons/${esc(lesson.id)}/move">
            <input type="hidden" name="direction" value="up" />
            <button class="move" type="submit" title="Move up" ${index === 0 ? 'disabled' : ''}>↑</button>
          </form>
          <form class="inline-form" method="post" action="/admin/tutorials/lessons/${esc(lesson.id)}/move">
            <input type="hidden" name="direction" value="down" />
            <button class="move" type="submit" title="Move down" ${index === lessons.length - 1 ? 'disabled' : ''}>↓</button>
          </form>
          <a class="btn btn-sm" href="/admin/tutorials/lessons/${esc(lesson.id)}/edit">Edit</a>
        </div>
      </div>`,
    )
    .join('\n');

  const body = `
${CSS}
  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin/tutorials">← Back to tutorials</a>
      <h1 class="page-title" style="margin-bottom:.15rem">${subject.icon ? `${esc(subject.icon)} ` : ''}${esc(subject.title)}</h1>
      <p style="font-size:.86rem;color:var(--ink-3)">${lessons.length} lesson${lessons.length === 1 ? '' : 's'}, in the order readers see them.</p>
    </div>
    <div class="spacer"></div>
    <a class="btn" href="/admin/tutorials/subjects/${esc(subject.id)}/edit">Edit subject</a>
    <a class="btn btn-primary" href="/admin/tutorials/subjects/${esc(subject.id)}/lessons/new">New lesson</a>
  </div>

  ${lessons.length ? rows : '<div class="empty"><p>No lessons in this subject yet.</p></div>'}
`;

  return layout({
    title: `${subject.title} lessons · Admin`,
    body,
    nav: adminNav('/admin/tutorials'),
    variant: 'admin',
    path: '/admin/tutorials',
    noindex: true,
  });
}

export function lessonEditorPage(
  subjects: Subject[],
  subject: Subject,
  lesson?: Tutorial,
): string {
  const editing = Boolean(lesson);
  const action = editing
    ? `/admin/tutorials/lessons/${esc(lesson!.id)}/edit`
    : `/admin/tutorials/subjects/${esc(subject.id)}/lessons/new`;

  const v = (value?: string) => esc(value ?? '');

  const options = subjects
    .map(
      (candidate) =>
        `<option value="${esc(candidate.id)}" ${candidate.id === (lesson?.subjectId ?? subject.id) ? 'selected' : ''}>${esc(candidate.title)}</option>`,
    )
    .join('');

  const levels = DIFFICULTIES.map(
    (level) =>
      `<option value="${level}" ${(lesson?.difficulty ?? 'beginner') === level ? 'selected' : ''}>${DIFFICULTY_LABELS[level]}</option>`,
  ).join('');

  const body = `
${CSS}
  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin/tutorials/subjects/${esc(subject.id)}">← Back to ${esc(subject.title)}</a>
      <h1 class="page-title" style="margin-bottom:.15rem">${editing ? 'Edit lesson' : 'New lesson'}</h1>
    </div>
  </div>

  <form method="post" action="${action}">
    <div class="form-grid">
      <div>
        <div class="panel">
          <h3>Lesson</h3>
          <div class="field">
            <label for="title">Title</label>
            <input type="text" id="title" name="title" required value="${v(lesson?.title)}"
                   placeholder="What an IP address actually is" />
          </div>
          <div class="field">
            <label for="summary">Summary</label>
            <textarea id="summary" name="summary" rows="2"
                      placeholder="One sentence. Shown in the lesson list.">${v(lesson?.summary)}</textarea>
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="content">Content</label>
            <textarea id="content" name="content" rows="22" required
                      placeholder="Markdown. Headings, lists, tables and code blocks all work.">${v(lesson?.content)}</textarea>
          </div>
        </div>
      </div>

      <div>
        <div class="panel">
          <h3>Placement</h3>
          <div class="field">
            <label for="subjectId">Subject</label>
            <select id="subjectId" name="subjectId">${options}</select>
            <p class="hint">Moving a lesson puts it at the end of the new subject.</p>
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="difficulty">Difficulty</label>
            <select id="difficulty" name="difficulty">${levels}</select>
          </div>
        </div>

        <div class="panel">
          <h3>Publishing</h3>
          <div class="field">
            <label for="status">Status</label>
            <select id="status" name="status">
              <option value="published" ${lesson?.status !== 'draft' ? 'selected' : ''}>Published</option>
              <option value="draft" ${lesson?.status === 'draft' ? 'selected' : ''}>Draft</option>
            </select>
          </div>
          <div class="field">
            <label for="tags">Tags</label>
            <input type="text" id="tags" name="tags" value="${v(lesson?.tags.join(', '))}"
                   placeholder="networking, dns" />
            <p class="hint">Comma separated.</p>
          </div>
          <button class="btn btn-primary" type="submit" style="width:100%">
            ${editing ? 'Save lesson' : 'Create lesson'}
          </button>
        </div>
      </div>
    </div>
  </form>

  ${
    editing
      ? `<form method="post" action="/admin/tutorials/lessons/${esc(lesson!.id)}/delete"
              onsubmit="return confirm('Delete this lesson? This cannot be undone.')">
          <button class="btn btn-danger" type="submit">Delete lesson</button>
        </form>`
      : ''
  }
`;

  return layout({
    title: editing ? 'Edit lesson · Admin' : 'New lesson · Admin',
    body,
    nav: adminNav('/admin/tutorials'),
    variant: 'admin',
    path: '/admin/tutorials',
    noindex: true,
  });
}
