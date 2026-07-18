import {
  DETAILED_WORD_LIMIT,
  PROJECT_STATUSES,
  Project,
  SHORT_WORD_LIMIT,
  STATUS_LABELS,
} from '../projects/project.model';
import { adminNav, esc, layout } from './layout';
import { CHIP_CSS, CHIP_JS } from './chip-input';

const CSS = `
<style>
  .p-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
  .p-thumb {
    width: 76px; height: 44px; object-fit: cover; display: block;
    border-radius: 6px; border: 1px solid var(--border); background: var(--surface-2);
  }
  /* These rules live in the posts dashboard stylesheet; without them here the
     title and description ran together on one line. */
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th {
    text-align: left; font-size: 0.72rem; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--ink-3); font-weight: 700;
    padding: 0.6rem 0.7rem; border-bottom: 1px solid var(--border);
  }
  td { padding: 0.8rem 0.7rem; border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:hover td { background: var(--surface-2); }
  td .t { color: var(--ink); font-weight: 600; display: block; margin-bottom: 0.2rem; }
  td .s { font-size: 0.8rem; color: var(--ink-3); display: block; line-height: 1.45; }
  .col-thumb { width: 90px; }
  .col-actions { width: 1%; white-space: nowrap; }
  .actions { display: flex; gap: 0.35rem; flex-wrap: nowrap; }

  .admin-search { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .admin-search input { flex: 1; min-width: 200px; border-radius: 100px; padding-left: 1rem; }
  .search-note { font-size: 0.85rem; color: var(--ink-3); margin-bottom: 0.85rem; }

  .pager {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;
  }
  .pager .count { font-size: 0.82rem; color: var(--ink-3); }
  .pager-links { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .pager-links a, .pager-links span {
    min-width: 34px; text-align: center;
    padding: 0.35rem 0.6rem; border-radius: 8px;
    border: 1px solid var(--border); font-size: 0.84rem; color: var(--ink-2);
  }
  .pager-links a:hover { border-color: var(--accent); color: var(--accent); }
  .pager-links .current {
    background: var(--accent); color: var(--accent-ink); border-color: var(--accent);
    font-weight: 700;
  }
  .pager-links .disabled { opacity: 0.4; }
  @media (max-width: 700px) {
    .p-table-wrap table { min-width: 720px; }
  }
  .status-pill {
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 0.12rem 0.5rem; border-radius: 100px;
    border: 1px solid currentColor; white-space: nowrap;
  }
  .status-completed { color: var(--good); }
  .status-ongoing { color: var(--accent); }
  .status-archived { color: var(--ink-3); }
  .status-planned { color: var(--warn); }
  .form-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1.75rem; align-items: start; }
  @media (max-width: 880px) { .form-grid { grid-template-columns: 1fr; } }
  .panel {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.15rem; margin-bottom: 1.15rem;
  }
  .panel h3 {
    font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); margin-bottom: 0.9rem;
  }
  .two-up { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
  @media (max-width: 600px) { .two-up { grid-template-columns: 1fr; } }
  .cover-preview {
    width: 100%; aspect-ratio: 2/1; object-fit: cover;
    border-radius: 10px; border: 1px solid var(--border);
    background: var(--surface); margin-bottom: 0.7rem;
  }
  .check-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; }
  .check-row input { width: auto; }
  .field-head {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 0.5rem; margin-bottom: 0.4rem;
  }
  .field-head label { margin: 0; }
  .word-count {
    font-size: 0.74rem; color: var(--ink-3);
    font-variant-numeric: tabular-nums;
  }
  .word-count.near { color: var(--warn); }
  .word-count.over { color: var(--danger); font-weight: 700; }
  .toggle-row {
    display: inline-flex; align-items: center; gap: 0.45rem;
    font-size: 0.84rem; font-weight: 500; color: var(--ink-2);
    margin-top: 0.5rem; cursor: pointer; user-select: none;
  }
  .toggle-row input { width: auto; margin: 0; }
${CHIP_CSS}
</style>`;

export function projectsAdminPage(opts: {
  projects: Project[];
  githubUser: string;
  flash?: { kind: 'ok' | 'err'; text: string };
  query?: string;
  page?: number;
  pageCount?: number;
  total?: number;
}): string {
  const {
    projects,
    githubUser,
    flash,
    query = '',
    page = 1,
    pageCount = 1,
    total = projects.length,
  } = opts;

  const pageLink = (n: number, label = String(n), extra = ''): string =>
    `<a href="/admin/projects?page=${n}${query ? `&q=${encodeURIComponent(query)}` : ''}" class="${extra}">${label}</a>`;

  // A window around the current page keeps the control short at any size.
  const windowStart = Math.max(1, Math.min(page - 2, pageCount - 4));
  const windowEnd = Math.min(pageCount, Math.max(page + 2, 5));
  const numbers: string[] = [];

  for (let n = windowStart; n <= windowEnd; n++) {
    numbers.push(
      n === page
        ? `<span class="current" aria-current="page">${n}</span>`
        : pageLink(n),
    );
  }

  const body = `
${CSS}
  ${flash ? `<div class="flash ${flash.kind}">${esc(flash.text)}</div>` : ''}

  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin">← Back to dashboard</a>
      <h1 class="page-title" style="margin-bottom:.15rem">Projects</h1>
      <p style="color:var(--ink-3);font-size:.9rem">
        ${projects.length} project${projects.length === 1 ? '' : 's'} ·
        <a href="/projects" style="color:var(--accent)">View page →</a>
      </p>
    </div>
    <div style="margin-left:auto;display:flex;gap:.5rem;flex-wrap:wrap">
      <form method="post" action="/admin/projects/import"
            onsubmit="return confirm('Import public repositories from GitHub? Existing projects are matched by repository URL and left untouched.')">
        <button class="btn btn-ghost" type="submit" ${githubUser ? '' : 'disabled title="Set a GitHub username in Settings first"'}>
          ↓ Import from GitHub${githubUser ? ` (@${esc(githubUser)})` : ''}
        </button>
      </form>
      <a class="btn" href="/admin/projects/new">＋ New project</a>
    </div>
  </div>

  <form class="admin-search" action="/admin/projects" method="get" role="search">
    <input type="search" name="q" value="${esc(query)}"
           placeholder="Search titles, descriptions, technologies or tags…" aria-label="Search projects" />
    <button class="btn" type="submit">Search</button>
    ${query ? '<a class="btn btn-ghost" href="/admin/projects">Clear</a>' : ''}
  </form>

  ${
    query
      ? `<p class="search-note">${total} result${total === 1 ? '' : 's'} for “${esc(query)}”</p>`
      : ''
  }

  ${
    projects.length
      ? `<div class="p-table-wrap"><table>
    <thead><tr>
      <th class="col-thumb"></th><th>Project</th><th>Year</th><th>Status</th><th>Technologies</th><th class="col-actions"></th>
    </tr></thead>
    <tbody>
      ${projects
        .map(
          (p) => `<tr>
        <td class="col-thumb">${p.coverUrl ? `<img class="p-thumb" src="${esc(p.coverUrl)}" alt="" loading="lazy" />` : '<div class="p-thumb"></div>'}</td>
        <td>
          <span class="t">${esc(p.title)}${p.featured ? ' ★' : ''}</span>
          <span class="s">${esc(p.description.slice(0, 90) || '—')}</span>
        </td>
        <td class="s">${esc(p.year || '—')}</td>
        <td><span class="status-pill status-${esc(p.status)}">${esc(STATUS_LABELS[p.status])}</span></td>
        <td><div class="tag-row">${p.technologies.map((t) => `<span class="tag">${esc(t)}</span>`).join('') || '<span class="s">—</span>'}</div></td>
        <td class="col-actions">
          <div class="actions">
            <a class="btn btn-ghost btn-sm" href="/projects/${esc(p.slug)}">View</a>
            <a class="btn btn-ghost btn-sm" href="/admin/projects/${esc(p.id)}/edit">Edit</a>
            <form method="post" action="/admin/projects/${esc(p.id)}/delete"
                  onsubmit="return confirm('Delete “${esc(p.title).replace(/'/g, '&#39;')}”?')">
              <button class="btn btn-danger btn-sm" type="submit">Delete</button>
            </form>
          </div>
        </td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table></div>
  ${
    pageCount > 1
      ? `<div class="pager">
    <span class="count">Page ${page} of ${pageCount} · ${total} project${total === 1 ? '' : 's'}</span>
    <div class="pager-links">
      ${page > 1 ? pageLink(page - 1, '← Prev') : '<span class="disabled">← Prev</span>'}
      ${windowStart > 1 ? pageLink(1, '1') + '<span class="disabled">…</span>' : ''}
      ${numbers.join('')}
      ${windowEnd < pageCount ? '<span class="disabled">…</span>' + pageLink(pageCount, String(pageCount)) : ''}
      ${page < pageCount ? pageLink(page + 1, 'Next →') : '<span class="disabled">Next →</span>'}
    </div>
  </div>`
      : ''
  }`
      : `<div class="empty">
      <p>${query ? `Nothing matches “${esc(query)}”.` : 'No projects yet.'}</p>
      <p style="margin-top:1.25rem">
        ${githubUser ? 'Import them from GitHub, or add one by hand.' : 'Set your GitHub username in Settings to import them automatically.'}
      </p>
      <p style="margin-top:1rem">
        ${query ? '<a class="btn btn-ghost" href="/admin/projects">Clear search</a>' : '<a class="btn" href="/admin/projects/new">Add a project</a>'}
      </p>
    </div>`
  }`;

  return layout({
    title: 'Projects — admin',
    body,
    nav: adminNav('/admin/projects'),
    variant: 'admin',
    noindex: true,
  });
}

export function projectEditorPage(project?: Project): string {
  const editing = Boolean(project);
  const action = editing
    ? `/admin/projects/${esc(project!.id)}/edit`
    : '/admin/projects/new';

  const v = (value?: string) => esc(value ?? '');

  const body = `
${CSS}
  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin/projects">← Back to projects</a>
      <h1 class="page-title" style="margin-bottom:.15rem">${editing ? 'Edit project' : 'New project'}</h1>
    </div>
  </div>

  <form method="post" action="${action}">
    <div class="form-grid">
      <div>
        <div class="panel">
          <h3>Basics</h3>
          <div class="field">
            <label for="title">Title</label>
            <input type="text" id="title" name="title" required value="${v(project?.title)}" />
          </div>
          <div class="field">
            <div class="field-head">
              <label for="description">Short description</label>
              <span class="word-count" data-for="description"></span>
            </div>
            <textarea id="description" name="description" rows="3"
                      data-limit="${SHORT_WORD_LIMIT}"
                      placeholder="One or two sentences. Shown on project cards.">${v(project?.description)}</textarea>
            <label class="toggle-row">
              <input type="hidden" name="showShort" value="off" />
              <input type="checkbox" name="showShort" value="on"
                     ${project === undefined || project.showShort ? 'checked' : ''} />
              <span>Show the short description</span>
            </label>
          </div>

          <div class="field" style="margin-bottom:0">
            <div class="field-head">
              <label for="detailedDescription">Detailed description</label>
              <span class="word-count" data-for="detailedDescription"></span>
            </div>
            <textarea id="detailedDescription" name="detailedDescription" rows="8"
                      data-limit="${DETAILED_WORD_LIMIT}"
                      placeholder="The full story. Markdown works — **bold**, ==highlight==, lists, links.">${v(project?.detailedDescription)}</textarea>
            <label class="toggle-row">
              <input type="hidden" name="showDetailed" value="off" />
              <input type="checkbox" name="showDetailed" value="on"
                     ${project === undefined || project.showDetailed ? 'checked' : ''} />
              <span>Show the detailed description on the project page</span>
            </label>
          </div>
        </div>

        <div class="panel">
          <h3>Links</h3>
          <div class="field">
            <label for="repoUrl">Repository URL</label>
            <input type="text" id="repoUrl" name="repoUrl" value="${v(project?.repoUrl)}"
                   placeholder="https://github.com/user/repo" />
            <p class="hint">GitHub repositories get a preview image automatically.</p>
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="demoUrl">Live demo URL</label>
            <input type="text" id="demoUrl" name="demoUrl" value="${v(project?.demoUrl)}"
                   placeholder="https://example.com" />
          </div>
        </div>

        <div class="panel">
          <h3>Classification</h3>
          <div class="field">
            <label for="technologies-box">Technologies</label>
            <div class="chip-input" id="technologies-box" data-target="technologies" data-sep="comma" data-max="20">
              <input type="text" placeholder="nestjs, docker…" aria-label="Add technologies" />
            </div>
            <input type="hidden" id="technologies" name="technologies" value="${v(project?.technologies.join(', '))}" />
            <p class="hint">Enter or comma to add. <span class="chip-count"></span></p>
          </div>
          <div class="field">
            <label for="topics-box">Topics</label>
            <div class="chip-input" id="topics-box" data-target="topics" data-sep="comma" data-max="20">
              <input type="text" placeholder="backend, devops…" aria-label="Add topics" />
            </div>
            <input type="hidden" id="topics" name="topics" value="${v(project?.topics.join(', '))}" />
            <p class="hint">Broad areas. <span class="chip-count"></span></p>
          </div>
          <div class="field">
            <label for="keywords-box">Keywords</label>
            <div class="chip-input" id="keywords-box" data-target="keywords" data-sep="comma" data-max="20">
              <input type="text" placeholder="ecommerce, authentication…" aria-label="Add keywords" />
            </div>
            <input type="hidden" id="keywords" name="keywords" value="${v(project?.keywords.join(', '))}" />
            <p class="hint">What it is about. <span class="chip-count"></span></p>
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="tags-box">Tags</label>
            <div class="chip-input" id="tags-box" data-target="tags" data-sep="comma" data-max="20">
              <input type="text" placeholder="learning, side-project…" aria-label="Add tags" />
            </div>
            <input type="hidden" id="tags" name="tags" value="${v(project?.tags.join(', '))}" />
            <p class="hint">All four become clickable pages. <span class="chip-count"></span></p>
          </div>
        </div>
      </div>

      <aside>
        <div class="panel">
          <h3>Cover</h3>
          <img class="cover-preview" id="cover-preview"
               src="${v(project?.coverUrl)}" alt="" />
          <input type="hidden" id="coverUrl" name="coverUrl" value="${v(project?.coverUrl)}" />
          <input type="file" id="cover-file" accept="image/*" hidden />
          <button type="button" class="btn btn-ghost btn-sm" id="cover-btn">Upload cover</button>
          <button type="button" class="btn btn-ghost btn-sm" id="cover-auto">Use GitHub preview</button>
          <p class="hint" id="cover-status">Leave empty to use the repository preview.</p>
        </div>

        <div class="panel">
          <h3>Timeline</h3>
          <div class="field">
            <label for="year">Year</label>
            <input type="text" id="year" name="year" value="${v(project?.year)}" placeholder="2025" />
          </div>
          <div class="two-up">
            <div class="field">
              <label for="startDate">Start</label>
              <input type="text" id="startDate" name="startDate" value="${v(project?.startDate)}" placeholder="2025-01" />
            </div>
            <div class="field">
              <label for="endDate">End</label>
              <input type="text" id="endDate" name="endDate" value="${v(project?.endDate)}" placeholder="2025-06" />
            </div>
          </div>
          <div class="field" style="margin-bottom:.75rem">
            <label for="status">Status</label>
            <select id="status" name="status">
              ${PROJECT_STATUSES.map(
                (st) =>
                  `<option value="${st}" ${project?.status === st ? 'selected' : ''}>${STATUS_LABELS[st]}</option>`,
              ).join('')}
            </select>
          </div>
          <label class="check-row">
            <input type="checkbox" name="featured" ${project?.featured ? 'checked' : ''} />
            Feature this project
          </label>
        </div>

        <div class="panel">
          <h3>Save</h3>
          <button class="btn" type="submit" style="width:100%;justify-content:center">
            ${editing ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </aside>
    </div>
  </form>

<script>
(function () {
  var repo = document.getElementById('repoUrl');
  var hidden = document.getElementById('coverUrl');
  var preview = document.getElementById('cover-preview');
  var status = document.getElementById('cover-status');
  var file = document.getElementById('cover-file');

  function githubPreview(url) {
    var m = /github\\.com\\/([^\\/]+)\\/([^\\/?#]+)/i.exec(url || '');
    if (!m) return '';
    return 'https://opengraph.githubassets.com/1/' + m[1] + '/' + m[2].replace(/\\.git$/, '');
  }

  document.getElementById('cover-auto').addEventListener('click', function () {
    var url = githubPreview(repo.value);
    if (!url) { status.textContent = 'Enter a GitHub repository URL first.'; return; }
    hidden.value = url;
    preview.src = url;
    status.textContent = 'Using the GitHub preview image.';
  });

  document.getElementById('cover-btn').addEventListener('click', function () { file.click(); });

  file.addEventListener('change', function () {
    if (!file.files[0]) return;
    status.textContent = 'Uploading…';
    var data = new FormData();
    data.append('file', file.files[0]);

    fetch('/admin/uploads', { method: 'POST', body: data, credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || 'Upload failed'); });
        return r.json();
      })
      .then(function (j) {
        hidden.value = j.url;
        preview.src = j.url;
        status.textContent = 'Uploaded.';
      })
      .catch(function (err) { status.textContent = 'Upload failed: ' + err.message; });
  });

  // Offer the repo preview as soon as a GitHub URL is pasted.
  repo.addEventListener('blur', function () {
    if (hidden.value) return;
    var url = githubPreview(repo.value);
    if (url) { hidden.value = url; preview.src = url; status.textContent = 'Using the GitHub preview image.'; }
  });
})();
</script>
<script>
(function () {
  // Live word count against the server-side cap. The server trims rather
  // than rejecting, so this is guidance, not validation.
  document.querySelectorAll('textarea[data-limit]').forEach(function (area) {
    var limit = parseInt(area.getAttribute('data-limit'), 10);
    var label = document.querySelector('.word-count[data-for="' + area.id + '"]');
    if (!label) return;

    function update() {
      var words = area.value.trim().split(/\\s+/).filter(Boolean).length;
      label.textContent = words + ' / ' + limit + ' words';
      label.classList.toggle('near', words > limit * 0.8 && words <= limit);
      label.classList.toggle('over', words > limit);
    }

    area.addEventListener('input', update);
    update();
  });
})();
</script>
${CHIP_JS}`;

  return layout({
    title: `${editing ? 'Edit' : 'New'} project — admin`,
    body,
    nav: adminNav('/admin/projects'),
    variant: 'admin',
    noindex: true,
  });
}
