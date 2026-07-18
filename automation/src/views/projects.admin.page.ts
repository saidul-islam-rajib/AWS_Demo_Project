import {
  PROJECT_STATUSES,
  Project,
  STATUS_LABELS,
} from '../projects/project.model';
import { adminNav, esc, layout } from './layout';

const CSS = `
<style>
  .p-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
  .p-thumb {
    width: 76px; height: 40px; object-fit: cover;
    border-radius: 6px; border: 1px solid var(--border); background: var(--surface-2);
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
</style>`;

export function projectsAdminPage(opts: {
  projects: Project[];
  githubUser: string;
  flash?: { kind: 'ok' | 'err'; text: string };
}): string {
  const { projects, githubUser, flash } = opts;

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

  ${
    projects.length
      ? `<div class="p-table-wrap"><table>
    <thead><tr>
      <th></th><th>Project</th><th>Year</th><th>Status</th><th>Technologies</th><th></th>
    </tr></thead>
    <tbody>
      ${projects
        .map(
          (p) => `<tr>
        <td>${p.coverUrl ? `<img class="p-thumb" src="${esc(p.coverUrl)}" alt="" loading="lazy" />` : '<div class="p-thumb"></div>'}</td>
        <td>
          <span class="t">${esc(p.title)}${p.featured ? ' ★' : ''}</span>
          <span class="s">${esc(p.description.slice(0, 70) || '—')}</span>
        </td>
        <td class="s">${esc(p.year || '—')}</td>
        <td><span class="status-pill status-${esc(p.status)}">${esc(STATUS_LABELS[p.status])}</span></td>
        <td><div class="tag-row">${p.technologies.map((t) => `<span class="tag">${esc(t)}</span>`).join('') || '<span class="s">—</span>'}</div></td>
        <td>
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
  </table></div>`
      : `<div class="empty">
      <p>No projects yet.</p>
      <p style="margin-top:1.25rem">
        ${githubUser ? 'Import them from GitHub, or add one by hand.' : 'Set your GitHub username in Settings to import them automatically.'}
      </p>
      <p style="margin-top:1rem"><a class="btn" href="/admin/projects/new">Add a project</a></p>
    </div>`
  }`;

  return layout({
    title: 'Projects — admin',
    body,
    nav: adminNav(),
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
          <div class="field" style="margin-bottom:0">
            <label for="description">Description</label>
            <textarea id="description" name="description" rows="4"
                      placeholder="What it does, and why you built it">${v(project?.description)}</textarea>
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
            <label for="technologies">Technologies</label>
            <input type="text" id="technologies" name="technologies"
                   value="${v(project?.technologies.join(', '))}" placeholder="nestjs, docker, postgresql" />
          </div>
          <div class="field">
            <label for="topics">Topics</label>
            <input type="text" id="topics" name="topics"
                   value="${v(project?.topics.join(', '))}" placeholder="backend, devops" />
          </div>
          <div class="field">
            <label for="keywords">Keywords</label>
            <input type="text" id="keywords" name="keywords"
                   value="${v(project?.keywords.join(', '))}" placeholder="ecommerce, authentication" />
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="tags">Tags</label>
            <input type="text" id="tags" name="tags"
                   value="${v(project?.tags.join(', '))}" placeholder="learning, side-project" />
            <p class="hint">All four are comma separated, lowercased, and become clickable pages.</p>
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
</script>`;

  return layout({
    title: `${editing ? 'Edit' : 'New'} project — admin`,
    body,
    nav: adminNav(),
    variant: 'admin',
    noindex: true,
  });
}
