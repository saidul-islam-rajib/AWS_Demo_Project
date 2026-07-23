import {
  Chapter,
  ChapterGroup,
  DEFAULT_COMPLETION_SECONDS,
  DIFFICULTIES,
  ENROLMENT_POLICIES,
  enrolmentPolicy,
  DIFFICULTY_LABELS,
  MAX_COMPLETION_SECONDS,
  Subject,
  SubjectStats,
  Tutorial,
  formatDuration,
} from '../../tutorials/tutorial.model';
import { readingMinutes } from '../../posts/post.model';
import { adminNav, esc, layout } from '../shared/layout';
import { emptyState, statusPill } from '../shared/components';
import { SORTABLE_SCRIPT } from '../shared/scripts/sortable';
import { CONDITIONAL_FIELDS_SCRIPT } from '../shared/scripts/conditional-fields';
import { TUTORIALS_ADMIN_STYLES as STYLES } from './tutorials.styles';

const CSS = STYLES;

function describeDwell(seconds: number): string {
  if (seconds < 60) return `about ${seconds} seconds of reading`;

  const minutes = Math.round(seconds / 60);

  return `about ${minutes} minute${minutes === 1 ? '' : 's'} of reading`;
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

      return `<div class="subj-row" draggable="true" data-sort-id="${esc(subject.id)}">
        <span class="grip" aria-hidden="true">⠿</span>
        <span class="icon">${subject.icon ? esc(subject.icon) : '📘'}</span>
        <div class="info">
          <b>${esc(subject.title)}</b>
          <span>
            ${stat.total} published${draftCount ? ` · ${draftCount} draft` : ''}${subject.enrolment === 'key' ? ' · key required' : ''}
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
      <p style="font-size:.86rem;color:var(--ink-3)">Subjects hold ordered lessons.</p>
    </div>
    <div class="spacer"></div>
    <a class="btn btn-primary" href="/admin/tutorials/subjects/new">New subject</a>
  </div>

  ${subjects.length > 1 ? '<p class="sort-hint">Drag a subject to reorder it, or use the arrows.</p>' : ''}

  <form method="post" action="/admin/tutorials/reorder" data-sortable-form>
    <input type="hidden" name="order" value="" data-sortable-order />
  </form>

  <div data-sortable>
    ${subjects.length ? rows : emptyState('No subjects yet. Create one to start adding lessons.')}
  </div>
`;

  return layout({
    title: 'Tutorials · Admin',
    body: body + SORTABLE_SCRIPT,
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
  const current = enrolmentPolicy(subject?.enrolment ?? 'open');

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

          <div class="field">
            <label for="enrolment">Enrolment</label>
            <select id="enrolment" name="enrolment" data-reveals>
              ${ENROLMENT_POLICIES.map(
                (policy) =>
                  `<option value="${esc(policy.value)}" data-reveals="${esc(policy.reveals)}" ${policy.value === current.value ? 'selected' : ''}>${esc(policy.label)}</option>`,
              ).join('')}
            </select>
            <p class="hint">${esc(current.hint)}</p>
          </div>

          <div class="field" id="enrol-key-field" ${current.reveals ? '' : 'hidden'}>
            <label for="enrolKey">Enrolment key</label>
            <input type="text" id="enrolKey" name="enrolKey" value="${v(subject?.enrolKey)}"
                   autocomplete="off" placeholder="autumn-2026" />
            <p class="hint">
              Share this with your students. Anyone who has it can enrol, so it
              identifies the course rather than the person.
            </p>
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
    body: body + CONDITIONAL_FIELDS_SCRIPT,
    nav: adminNav('/admin/tutorials'),
    variant: 'admin',
    path: '/admin/tutorials',
    noindex: true,
  });
}

export function subjectLessonsPage(
  subject: Subject,
  groups: ChapterGroup[],
): string {
  const total = groups.reduce((sum, group) => sum + group.lessons.length, 0);
  const chapterCount = groups.filter((group) => group.chapter).length;

  let position = 0;

  const sections = groups
    .map((group, index) => {
      const rows = group.lessons
        .map((lesson, within) => {
          position += 1;

          return `<div class="lesson-row" draggable="true" data-sort-id="${esc(lesson.id)}">
            <span class="grip" aria-hidden="true">⠿</span>
            <span class="num" data-sort-number>${position}</span>
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
                <button class="move" type="submit" title="Move up" ${within === 0 ? 'disabled' : ''}>↑</button>
              </form>
              <form class="inline-form" method="post" action="/admin/tutorials/lessons/${esc(lesson.id)}/move">
                <input type="hidden" name="direction" value="down" />
                <button class="move" type="submit" title="Move down" ${within === group.lessons.length - 1 ? 'disabled' : ''}>↓</button>
              </form>
              <a class="btn btn-sm" href="/admin/tutorials/lessons/${esc(lesson.id)}/edit">Edit</a>
            </div>
          </div>`;
        })
        .join('\n');

      const head = group.chapter
        ? `<div class="chapter-bar">
             <div class="info">
               <b>${esc(group.chapter.title)}</b>
               <span>${group.lessons.length} ${group.lessons.length === 1 ? 'lesson' : 'lessons'}${group.chapter.summary ? ` · ${esc(group.chapter.summary)}` : ''}</span>
             </div>
             <div class="actions">
               <form class="inline-form" method="post" action="/admin/tutorials/chapters/${esc(group.chapter.id)}/move">
                 <input type="hidden" name="direction" value="up" />
                 <button class="move" type="submit" title="Move chapter up" ${index === 0 ? 'disabled' : ''}>↑</button>
               </form>
               <form class="inline-form" method="post" action="/admin/tutorials/chapters/${esc(group.chapter.id)}/move">
                 <input type="hidden" name="direction" value="down" />
                 <button class="move" type="submit" title="Move chapter down" ${index === groups.length - 1 ? 'disabled' : ''}>↓</button>
               </form>
               <a class="btn btn-sm" href="/admin/tutorials/chapters/${esc(group.chapter.id)}/edit">Edit</a>
             </div>
           </div>`
        : `<div class="chapter-bar loose">
             <div class="info">
               <b>Not in a chapter</b>
               <span>${group.lessons.length} ${group.lessons.length === 1 ? 'lesson' : 'lessons'} · set one from the lesson editor</span>
             </div>
           </div>`;

      return `<section class="chapter-block">
        ${head}
        ${group.lessons.length ? rows : '<p class="sort-hint" style="padding:.4rem .2rem">No lessons in this chapter yet.</p>'}
      </section>`;
    })
    .join('\n');

  const body = `
${CSS}
  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin/tutorials">← Back to tutorials</a>
      <h1 class="page-title" style="margin-bottom:.15rem">${subject.icon ? `${esc(subject.icon)} ` : ''}${esc(subject.title)}</h1>
      <p style="font-size:.86rem;color:var(--ink-3)">${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'} · ${total} ${total === 1 ? 'lesson' : 'lessons'}, in the order readers see them.</p>
    </div>
    <div class="spacer"></div>
    <a class="btn" href="/admin/tutorials/subjects/${esc(subject.id)}/edit">Edit subject</a>
    <a class="btn" href="/admin/tutorials/subjects/${esc(subject.id)}/chapters/new">New chapter</a>
    <a class="btn btn-primary" href="/admin/tutorials/subjects/${esc(subject.id)}/lessons/new">New lesson</a>
  </div>

  ${total > 1 ? '<p class="sort-hint">Drag a lesson to reorder it. Use the arrows to reorder chapters.</p>' : ''}

  <form method="post" action="/admin/tutorials/subjects/${esc(subject.id)}/reorder" data-sortable-form>
    <input type="hidden" name="order" value="" data-sortable-order />
  </form>

  <div data-sortable>
    ${total || chapterCount ? sections : emptyState('No lessons in this subject yet.')}
  </div>
`;

  return layout({
    title: `${subject.title} lessons · Admin`,
    body: body + SORTABLE_SCRIPT,
    nav: adminNav('/admin/tutorials'),
    variant: 'admin',
    path: '/admin/tutorials',
    noindex: true,
  });
}

export function chapterEditorPage(subject: Subject, chapter?: Chapter): string {
  const editing = Boolean(chapter);
  const action = editing
    ? `/admin/tutorials/chapters/${esc(chapter!.id)}/edit`
    : `/admin/tutorials/subjects/${esc(subject.id)}/chapters/new`;

  const v = (value?: string) => esc(value ?? '');

  const body = `
${CSS}
  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin/tutorials/subjects/${esc(subject.id)}">← Back to ${esc(subject.title)}</a>
      <h1 class="page-title" style="margin-bottom:.15rem">${editing ? 'Edit chapter' : 'New chapter'}</h1>
    </div>
  </div>

  <form method="post" action="${action}">
    <div class="form-grid">
      <div>
        <div class="panel">
          <h3>Chapter</h3>
          <div class="field">
            <label for="title">Title</label>
            <input type="text" id="title" name="title" required value="${v(chapter?.title)}"
                   placeholder="Addressing" />
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="summary">Summary</label>
            <textarea id="summary" name="summary" rows="3"
                      placeholder="One sentence on what this chapter covers.">${v(chapter?.summary)}</textarea>
            <p class="hint">Shown under the chapter heading on the public page.</p>
          </div>
        </div>
      </div>

      <div>
        <div class="panel">
          <h3>Save</h3>
          <button class="btn btn-primary" type="submit" style="width:100%">
            ${editing ? 'Save chapter' : 'Create chapter'}
          </button>
          ${editing ? '<p class="hint" style="margin-top:.75rem">Deleting a chapter keeps its lessons; they move out of any chapter.</p>' : ''}
        </div>
      </div>
    </div>
  </form>

  ${
    editing
      ? `<form method="post" action="/admin/tutorials/chapters/${esc(chapter!.id)}/delete"
              onsubmit="return confirm('Delete this chapter? Its lessons stay, but leave the chapter.')">
          <button class="btn btn-danger" type="submit">Delete chapter</button>
        </form>`
      : ''
  }
`;

  return layout({
    title: editing ? 'Edit chapter · Admin' : 'New chapter · Admin',
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
  chapters: Chapter[] = [],
): string {
  const editing = Boolean(lesson);
  const action = editing
    ? `/admin/tutorials/lessons/${esc(lesson!.id)}/edit`
    : `/admin/tutorials/subjects/${esc(subject.id)}/lessons/new`;

  const v = (value?: string) => esc(value ?? '');

  const dwell = lesson?.completionSeconds ?? DEFAULT_COMPLETION_SECONDS;

  const chapterOptions = [
    `<option value="" ${lesson?.chapterId ? '' : 'selected'}>No chapter</option>`,
    ...chapters.map(
      (chapter) =>
        `<option value="${esc(chapter.id)}" ${chapter.id === lesson?.chapterId ? 'selected' : ''}>${esc(chapter.title)}</option>`,
    ),
  ].join('');

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
          <div class="field">
            <label for="chapterId">Chapter</label>
            <select id="chapterId" name="chapterId">${chapterOptions}</select>
            <p class="hint">${chapters.length ? 'Lessons without a chapter appear first, above the chapters.' : 'This subject has no chapters yet. Create one from the subject page.'}</p>
          </div>
          <div class="field">
            <label for="difficulty">Difficulty</label>
            <select id="difficulty" name="difficulty">${levels}</select>
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="completionSeconds">Counts as read after</label>
            <div class="input-unit">
              <input type="number" id="completionSeconds" name="completionSeconds"
                     min="5" max="${MAX_COMPLETION_SECONDS}" step="5"
                     list="dwell-presets"
                     value="${dwell}" />
              <span class="unit">seconds</span>
              <span class="unit-readout">${describeDwell(dwell)}</span>
            </div>
            <datalist id="dwell-presets">
              <option value="15"></option>
              <option value="30"></option>
              <option value="60"></option>
              <option value="120"></option>
              <option value="300"></option>
              <option value="600"></option>
            </datalist>
            <p class="hint">
              Time a reader must spend at the end of this lesson before it marks
              itself complete. Roughly how long the lesson takes to read is a
              good starting point. They can always mark it by hand.
            </p>
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
