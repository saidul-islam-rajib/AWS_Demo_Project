import { Post, formatDate, readingMinutes } from '../posts/post.model';
import { adminNav, esc, layout } from './layout';

const ADMIN_CSS = `
<style>
  .kpi-row {
    display: grid; gap: 0.85rem; margin-bottom: 2.5rem;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  .kpi {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.05rem 1.15rem;
  }
  .kpi .l {
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); margin-bottom: 0.4rem; font-weight: 600;
  }
  .kpi .v { font-size: 1.75rem; font-weight: 700; color: var(--ink); line-height: 1.1; }
  .kpi .m { font-size: 0.76rem; color: var(--ink-3); margin-top: 0.2rem; }

  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th {
    text-align: left; font-size: 0.72rem; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--ink-3); font-weight: 700;
    padding: 0.6rem 0.7rem; border-bottom: 1px solid var(--border);
  }
  td { padding: 0.85rem 0.7rem; border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:hover td { background: var(--surface-2); }
  td .t { color: var(--ink); font-weight: 600; display: block; margin-bottom: 0.2rem; }
  td .s { font-size: 0.8rem; color: var(--ink-3); }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
  .pill {
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem; border-radius: 100px; font-weight: 700;
    border: 1px solid currentColor; white-space: nowrap;
  }
  .pill.pub { color: var(--good); }
  .pill.draft { color: var(--warn); }
  .actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
  .editor-grid { display: grid; grid-template-columns: 1fr 280px; gap: 1.75rem; align-items: start; }
  @media (max-width: 860px) { .editor-grid { grid-template-columns: 1fr; } }
  .panel {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.1rem;
  }
  .panel h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-3); margin-bottom: 0.9rem; }
</style>`;

export function dashboardPage(opts: {
  posts: Post[];
  stats: {
    total: number; published: number; drafts: number;
    tags: number; views: number; words: number; readingMinutes: number;
  };
  tags: { tag: string; count: number }[];
  flash?: { kind: 'ok' | 'err'; text: string };
}): string {
  const { posts, stats, tags, flash } = opts;

  const body = `
${ADMIN_CSS}
  ${flash ? `<div class="flash ${flash.kind}">${esc(flash.text)}</div>` : ''}

  <div class="toolbar">
    <div>
      <h1 class="page-title" style="margin-bottom:.15rem">Dashboard</h1>
      <p style="color:var(--ink-3);font-size:.9rem">Manage posts, drafts and tags.</p>
    </div>
    <a class="btn" href="/admin/posts/new" style="margin-left:auto">＋ New post</a>
  </div>

  <div class="kpi-row">
    <div class="kpi"><div class="l">Published</div><div class="v">${stats.published}</div><div class="m">live on the blog</div></div>
    <div class="kpi"><div class="l">Drafts</div><div class="v">${stats.drafts}</div><div class="m">not visible publicly</div></div>
    <div class="kpi"><div class="l">Tags</div><div class="v">${stats.tags}</div><div class="m">in use</div></div>
    <div class="kpi"><div class="l">Views</div><div class="v">${stats.views}</div><div class="m">all time</div></div>
    <div class="kpi"><div class="l">Words</div><div class="v">${stats.words.toLocaleString()}</div><div class="m">${stats.readingMinutes} min of reading</div></div>
  </div>

  <div class="section-label">Key highlights</div>
  <div class="tag-row" style="margin-bottom:2.5rem">
    ${
      tags.length
        ? tags
            .map(
              ({ tag, count }) =>
                `<a class="tag" href="/tag/${esc(tag)}">${esc(tag)} <span style="opacity:.6">${count}</span></a>`,
            )
            .join('')
        : '<span class="hint">No tags yet — add some when you write a post.</span>'
    }
  </div>

  <div class="section-label">All posts</div>
  ${
    posts.length
      ? `<div class="table-wrap"><table>
    <thead><tr>
      <th>Title</th><th>Status</th><th>Tags</th><th>Views</th><th>Updated</th><th></th>
    </tr></thead>
    <tbody>
      ${posts
        .map(
          (p) => `<tr>
        <td>
          <span class="t">${esc(p.title)}</span>
          <span class="s">${esc(p.subtitle || '—')} · ${readingMinutes(p.content)} min</span>
        </td>
        <td><span class="pill ${p.status === 'published' ? 'pub' : 'draft'}">${p.status}</span></td>
        <td><div class="tag-row">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('') || '<span class="s">—</span>'}</div></td>
        <td>${p.views}</td>
        <td class="s">${esc(formatDate(p.updatedAt))}</td>
        <td>
          <div class="actions">
            ${p.status === 'published' ? `<a class="btn btn-ghost btn-sm" href="/post/${esc(p.slug)}">View</a>` : ''}
            <a class="btn btn-ghost btn-sm" href="/admin/posts/${esc(p.id)}/edit">Edit</a>
            <form method="post" action="/admin/posts/${esc(p.id)}/delete"
                  onsubmit="return confirm('Delete “${esc(p.title).replace(/'/g, '&#39;')}”? This cannot be undone.')">
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
      <p>No posts yet.</p>
      <p style="margin-top:1.25rem"><a class="btn" href="/admin/posts/new">Write your first post</a></p>
    </div>`
  }`;

  return layout({
    title: 'Dashboard — Saidul Islam Rajib',
    body,
    nav: adminNav(),
    variant: 'admin',
  });
}

export function editorPage(post?: Post): string {
  const editing = Boolean(post);
  const action = editing ? `/admin/posts/${esc(post!.id)}/edit` : '/admin/posts/new';

  const body = `
${ADMIN_CSS}
  <div class="toolbar">
    <div>
      <h1 class="page-title" style="margin-bottom:.15rem">${editing ? 'Edit post' : 'New post'}</h1>
      <p style="color:var(--ink-3);font-size:.9rem">Body supports Markdown — headings, lists, links, and fenced code blocks.</p>
    </div>
    <a class="btn btn-ghost" href="/admin" style="margin-left:auto">Cancel</a>
  </div>

  <form method="post" action="${action}">
    <div class="editor-grid">
      <div>
        <div class="field">
          <label for="title">Title</label>
          <input type="text" id="title" name="title" required
                 value="${esc(post?.title ?? '')}" placeholder="What is this post about?" />
        </div>

        <div class="field">
          <label for="subtitle">Subtitle</label>
          <input type="text" id="subtitle" name="subtitle"
                 value="${esc(post?.subtitle ?? '')}" placeholder="One line of context" />
        </div>

        <div class="field">
          <label for="highlight">Key highlight</label>
          <input type="text" id="highlight" name="highlight"
                 value="${esc(post?.highlight ?? '')}" placeholder="The one sentence worth remembering" />
          <p class="hint">Shown as a pull quote on the card and at the top of the article.</p>
        </div>

        <div class="field">
          <label for="content">Body</label>
          <textarea id="content" name="content" class="mono" rows="22"
                    placeholder="Write in Markdown…">${esc(post?.content ?? '')}</textarea>
        </div>
      </div>

      <aside>
        <div class="panel" style="margin-bottom:1rem">
          <h3>Publish</h3>
          <div class="field">
            <label for="status">Status</label>
            <select id="status" name="status">
              <option value="draft" ${post?.status !== 'published' ? 'selected' : ''}>Draft</option>
              <option value="published" ${post?.status === 'published' ? 'selected' : ''}>Published</option>
            </select>
            <p class="hint">Drafts are hidden from the public blog.</p>
          </div>
          <button class="btn" type="submit" style="width:100%;justify-content:center">
            ${editing ? 'Save changes' : 'Create post'}
          </button>
        </div>

        <div class="panel">
          <h3>Tags</h3>
          <div class="field" style="margin-bottom:0">
            <input type="text" name="tags" value="${esc(post?.tags.join(', ') ?? '')}"
                   placeholder="jenkins, docker, aws" />
            <p class="hint">Comma separated, up to 8. Lowercased automatically.</p>
          </div>
        </div>
      </aside>
    </div>
  </form>`;

  return layout({
    title: `${editing ? 'Edit' : 'New'} post — Saidul Islam Rajib`,
    body,
    nav: adminNav(),
    variant: 'admin',
  });
}

export function loginPage(error?: string, notice?: string): string {
  const body = `
<style>
  .login-wrap { max-width: 380px; margin: 3rem auto; }
  .login-card {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 14px; padding: 2rem 1.75rem;
  }
</style>
  <div class="login-wrap">
    <div class="login-card">
      <h1 class="page-title" style="font-size:1.4rem;margin-bottom:.35rem">Sign in</h1>
      <p style="color:var(--ink-3);font-size:.88rem;margin-bottom:1.5rem">
        Admin access for writing and managing posts.
      </p>

      ${error ? `<div class="flash err">${esc(error)}</div>` : ''}
      ${notice ? `<div class="flash">${esc(notice)}</div>` : ''}

      <form method="post" action="/login">
        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required autofocus
                 placeholder="••••••••" />
        </div>
        <button class="btn" type="submit" style="width:100%;justify-content:center">Sign in</button>
      </form>

      <p class="hint" style="margin-top:1.25rem;text-align:center">
        <a href="/" style="color:var(--accent)">← Back to the blog</a>
      </p>
    </div>
  </div>`;

  return layout({ title: 'Sign in — Saidul Islam Rajib', body, nav: '<a href="/">Home</a>' });
}
