import {
  Post,
  formatDate,
  isScheduled,
  readingMinutes,
  toLocalInput,
} from '../posts/post.model';
import { adminNav, esc, layout } from './layout';
import { CHIP_CSS, CHIP_JS } from './chip-input';

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
  .pill.sched { color: var(--accent); }
  .actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
  .editor-grid { display: grid; grid-template-columns: 1fr 280px; gap: 1.75rem; align-items: start; }
  @media (max-width: 860px) { .editor-grid { grid-template-columns: 1fr; } }
  .panel {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.1rem;
  }
  .panel h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-3); margin-bottom: 0.9rem; }

  /* ---------- markdown toolbar ---------- */
  .toolbar-md {
    display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border); border-bottom: 0;
    border-radius: 8px 8px 0 0; background: var(--surface-2);
  }
  .toolbar-md button {
    background: transparent; border: 1px solid transparent; border-radius: 6px;
    color: var(--ink-2); font-family: inherit; font-size: 0.84rem;
    padding: 0.3rem 0.55rem; cursor: pointer; line-height: 1.2;
  }
  .toolbar-md button:hover { background: var(--bg); border-color: var(--border); color: var(--ink); }
  .toolbar-md button.active { background: var(--accent); color: var(--accent-ink); }
  .tb-sep { width: 1px; height: 18px; background: var(--border); margin: 0 0.25rem; }
  .tb-right { margin-left: auto; }
  .toolbar-md + textarea, .toolbar-md ~ textarea { border-radius: 0 0 8px 8px; }

  .preview-pane {
    border: 1px solid var(--border); border-top: 0; border-radius: 0 0 8px 8px;
    padding: 1.25rem; min-height: 200px; background: var(--surface);
    font-family: var(--serif); font-size: 1.02rem; line-height: 1.7; color: var(--ink-2);
  }
  .preview-pane > * + * { margin-top: 1rem; }
  .preview-pane h1 { font-size: 1.6rem; } .preview-pane h2 { font-size: 1.35rem; }
  .preview-pane h3 { font-size: 1.15rem; }
  .preview-pane img { max-width: 100%; border-radius: 8px; }
  .preview-pane ul, .preview-pane ol { padding-left: 1.4rem; }
  .preview-pane a { color: var(--accent); text-decoration: underline; }
  .preview-pane code {
    font-family: var(--mono); font-size: 0.86em; background: var(--surface-2);
    border: 1px solid var(--border); padding: 0.1em 0.38em; border-radius: 5px; color: var(--ink);
  }
  .preview-pane pre {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 8px; padding: 0.9rem 1rem; overflow-x: auto;
  }
  .preview-pane pre code { background: none; border: 0; padding: 0; }
  .preview-pane blockquote { border-left: 3px solid var(--border); padding-left: 1rem; color: var(--ink-3); }
  .preview-pane table { width: 100%; }
  .preview-pane .md-columns {
    display: grid; gap: 1rem; margin: 1.25rem 0;
    grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
    align-items: start;
  }
  .preview-pane .md-columns[data-cols="3"] { --cols: 3; }
  .preview-pane .md-columns img { margin: 0; width: 100%; max-height: 220px; object-fit: cover; }
  .preview-pane .md-col > *:first-child { margin-top: 0; }

  .md-help { margin-top: 0.9rem; }
  .md-help summary { cursor: pointer; font-size: 0.82rem; color: var(--ink-3); }
  .md-help summary:hover { color: var(--ink); }
  .md-table { margin-top: 0.7rem; font-size: 0.82rem; }
  .md-table td { padding: 0.3rem 0.6rem 0.3rem 0; border: 0; color: var(--ink-3); }
  .md-table td:first-child { white-space: nowrap; }

  .dragover { outline: 2px dashed var(--accent); outline-offset: -4px; }

${CHIP_CSS}

  .back-link {
    display: inline-block; font-size: 0.83rem; color: var(--ink-3);
    margin-bottom: 0.35rem;
  }
  .back-link:hover { color: var(--accent); }
  .scroll-status {
    text-align: center; padding: 1.25rem 1rem;
    font-size: 0.83rem; color: var(--ink-3);
  }
  .spinner {
    display: inline-block; width: 14px; height: 14px; margin-right: 0.5rem;
    border: 2px solid var(--border); border-top-color: var(--accent);
    border-radius: 50%; animation: spin 0.7s linear infinite;
    vertical-align: -2px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
</style>`;

/**
 * Infinite scroll for the dashboard table.
 *
 * Uses IntersectionObserver on a sentinel below the table, with a manual
 * button as the fallback when the API is unavailable. `loading` guards
 * against the observer firing repeatedly while a request is in flight.
 */
const INFINITE_SCROLL_JS = `
<script>
(function () {
  var sentinel = document.getElementById('scroll-sentinel');
  var tbody = document.getElementById('post-rows');
  var status = document.getElementById('scroll-status');
  if (!sentinel || !tbody) return;

  var loading = false;
  var hasMore = sentinel.getAttribute('data-has-more') === '1';
  var loaded = parseInt(sentinel.getAttribute('data-loaded') || '0', 10);

  function setStatus(html) { status.innerHTML = html; }

  function load() {
    if (loading || !hasMore) return;
    loading = true;
    setStatus('<span class="spinner"></span>Loading more…');

    fetch('/admin/posts/page?offset=' + loaded, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('Request failed (' + r.status + ')');
        return r.json();
      })
      .then(function (data) {
        if (data.rows) tbody.insertAdjacentHTML('beforeend', data.rows);
        loaded += data.count;
        hasMore = data.hasMore;
        loading = false;

        if (hasMore) {
          setStatus('Scroll for more…');
        } else {
          setStatus('That is everything — ' + loaded + ' posts.');
          if (observer) observer.disconnect();
        }
      })
      .catch(function (err) {
        loading = false;
        setStatus('Could not load more. <button type="button" class="btn btn-ghost btn-sm" id="retry">Retry</button>');
        var retry = document.getElementById('retry');
        if (retry) retry.addEventListener('click', load);
      });
  }

  var observer = null;

  if ('IntersectionObserver' in window) {
    // rootMargin starts the fetch before the sentinel is actually visible.
    observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) load();
    }, { rootMargin: '300px' });
    observer.observe(sentinel);
  } else if (hasMore) {
    setStatus('<button type="button" class="btn btn-ghost btn-sm" id="load-more">Load more</button>');
    document.getElementById('load-more').addEventListener('click', load);
  }
})();
</script>`;

/** Editor behaviour: formatting toolbar, image upload, server-rendered preview. */
const EDITOR_JS = `
<script>
(function () {
  var ta = document.getElementById('content');
  var preview = document.getElementById('preview');
  var status = document.getElementById('upload-status');
  var fileInput = document.getElementById('file-input');
  if (!ta) return;

  function surround(before, after) {
    var s = ta.selectionStart, e = ta.selectionEnd;
    var sel = ta.value.slice(s, e);
    ta.value = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    ta.focus();
    if (sel) ta.setSelectionRange(s + before.length, e + before.length);
    else ta.setSelectionRange(s + before.length, s + before.length);
  }

  function prefixLines(prefix) {
    var s = ta.selectionStart, e = ta.selectionEnd;
    var startOfLine = ta.value.lastIndexOf('\\n', s - 1) + 1;
    var block = ta.value.slice(startOfLine, e) || '';
    var n = 0;
    var out = block.split('\\n').map(function (line) {
      n++;
      return (prefix === '1. ' ? n + '. ' : prefix) + line;
    }).join('\\n');
    ta.value = ta.value.slice(0, startOfLine) + out + ta.value.slice(e);
    ta.focus();
    ta.setSelectionRange(startOfLine, startOfLine + out.length);
  }

  function insert(text) {
    var s = ta.selectionStart;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(ta.selectionEnd);
    ta.focus();
    ta.setSelectionRange(s + text.length, s + text.length);
  }

  var actions = {
    bold: function () { surround('**', '**'); },
    italic: function () { surround('*', '*'); },
    h2: function () { prefixLines('## '); },
    h3: function () { prefixLines('### '); },
    quote: function () { prefixLines('> '); },
    ul: function () { prefixLines('- '); },
    ol: function () { prefixLines('1. '); },
    code: function () { surround('\\\`', '\\\`'); },
    codeblock: function () { surround('\\n\\\`\\\`\\\`\\n', '\\n\\\`\\\`\\\`\\n'); },
    hr: function () { insert('\\n\\n---\\n\\n'); },
    cols2: function () {
      insert('\\n:::columns\\nLeft column — drop an image here\\n|||\\nRight column — text or another image\\n:::\\n');
    },
    cols3: function () {
      insert('\\n:::columns\\nFirst\\n|||\\nSecond\\n|||\\nThird\\n:::\\n');
    },
    link: function () {
      var url = prompt('Link URL:', 'https://');
      if (url) surround('[', '](' + url + ')');
    }
  };

  document.querySelectorAll('[data-md]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var fn = actions[btn.getAttribute('data-md')];
      if (fn) fn();
    });
  });

  ta.addEventListener('keydown', function (ev) {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    var k = ev.key.toLowerCase();
    if (k === 'b') { ev.preventDefault(); actions.bold(); }
    if (k === 'i') { ev.preventDefault(); actions.italic(); }
    if (k === 'k') { ev.preventDefault(); actions.link(); }
  });

  // ---------- image upload ----------
  function upload(file) {
    if (!file) return;
    status.textContent = 'Uploading ' + file.name + '…';

    var data = new FormData();
    data.append('file', file);

    fetch('/admin/uploads', { method: 'POST', body: data, credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || 'Upload failed'); });
        return r.json();
      })
      .then(function (j) {
        insert('\\n' + j.markdown + '\\n');
        status.textContent = 'Inserted ' + j.name + ' (' + Math.round(j.size / 1024) + ' KB)';
      })
      .catch(function (err) { status.textContent = 'Upload failed: ' + err.message; });
  }

  document.getElementById('btn-image').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () { upload(fileInput.files[0]); fileInput.value = ''; });

  // drag and drop, plus paste from clipboard
  ta.addEventListener('dragover', function (ev) { ev.preventDefault(); ta.classList.add('dragover'); });
  ta.addEventListener('dragleave', function () { ta.classList.remove('dragover'); });
  ta.addEventListener('drop', function (ev) {
    ev.preventDefault();
    ta.classList.remove('dragover');
    if (ev.dataTransfer.files.length) upload(ev.dataTransfer.files[0]);
  });
  ta.addEventListener('paste', function (ev) {
    var items = ev.clipboardData && ev.clipboardData.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === 0) {
        ev.preventDefault();
        upload(items[i].getAsFile());
        return;
      }
    }
  });

  // ---------- preview ----------
  var btn = document.getElementById('btn-preview');
  btn.addEventListener('click', function () {
    if (!preview.hidden) {
      preview.hidden = true; ta.hidden = false;
      btn.classList.remove('active'); btn.textContent = 'Preview';
      return;
    }
    fetch('/admin/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'same-origin',
      body: 'content=' + encodeURIComponent(ta.value)
    })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        preview.innerHTML = html;
        preview.hidden = false; ta.hidden = true;
        btn.classList.add('active'); btn.textContent = 'Edit';
      });
  });
})();
</script>`;

/**
 * Table rows only. The dashboard renders the first page with these, and the
 * infinite-scroll endpoint returns the same markup for the client to append.
 */
export function postRows(posts: Post[]): string {
  return posts
    .map(
      (p) => `<tr>
        <td>
          <span class="t">${esc(p.title)}</span>
          <span class="s">${esc(p.subtitle || '—')} · ${readingMinutes(p.content)} min</span>
        </td>
        <td><span class="pill ${isScheduled(p) ? 'sched' : p.status === 'published' ? 'pub' : 'draft'}">${isScheduled(p) ? 'scheduled' : p.status}</span></td>
        <td><div class="tag-row">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('') || '<span class="s">—</span>'}</div></td>
        <td>${p.views}</td>
        <td class="s">${esc(formatDate(p.publishedAt))}</td>
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
    .join('');
}

export function dashboardPage(opts: {
  posts: Post[];
  stats: {
    total: number;
    published: number;
    drafts: number;
    scheduled: number;
    tags: number;
    views: number;
    words: number;
    readingMinutes: number;
  };
  tags: { tag: string; count: number }[];
  flash?: { kind: 'ok' | 'err'; text: string };
  hasMore?: boolean;
}): string {
  const { posts, stats, tags, flash, hasMore = false } = opts;

  const body = `
${ADMIN_CSS}
  ${flash ? `<div class="flash ${flash.kind}">${esc(flash.text)}</div>` : ''}

  <div class="toolbar">
    <div>
      <a class="back-link" href="/">← Back to site</a>
      <h1 class="page-title" style="margin-bottom:.15rem">Dashboard</h1>
      <p style="color:var(--ink-3);font-size:.9rem">Manage posts, drafts and tags.</p>
    </div>
    <div style="margin-left:auto;display:flex;gap:.5rem;flex-wrap:wrap">
      <form method="post" action="/admin/import-starters"
            onsubmit="return confirm('Add the 10 starter posts? Existing posts are left untouched, and any already present are skipped.')">
        <button class="btn btn-ghost" type="submit" title="Add starter posts that are not already here">
          ↓ Import starter posts
        </button>
      </form>
      <a class="btn" href="/admin/posts/new">＋ New post</a>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi"><div class="l">Published</div><div class="v">${stats.published}</div><div class="m">live on the blog</div></div>
    <div class="kpi"><div class="l">Drafts</div><div class="v">${stats.drafts}</div><div class="m">not visible publicly</div></div>
    <div class="kpi"><div class="l">Scheduled</div><div class="v">${stats.scheduled}</div><div class="m">go live later</div></div>
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
    <tbody id="post-rows">
      ${postRows(posts)}
    </tbody>
  </table></div>
  <div id="scroll-sentinel" data-has-more="${hasMore ? '1' : '0'}" data-loaded="${posts.length}"></div>
  <div id="scroll-status" class="scroll-status">${hasMore ? 'Scroll for more…' : 'That is everything.'}</div>`
      : `<div class="empty">
      <p>No posts yet.</p>
      <p style="margin-top:1.25rem"><a class="btn" href="/admin/posts/new">Write your first post</a></p>
    </div>`
  }
${INFINITE_SCROLL_JS}`;

  return layout({
    title: 'Dashboard — Saidul Islam Rajib',
    body,
    nav: adminNav('/admin'),
    variant: 'admin',
  });
}

export function editorPage(post?: Post): string {
  const editing = Boolean(post);
  const action = editing
    ? `/admin/posts/${esc(post!.id)}/edit`
    : '/admin/posts/new';

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
          <label for="highlight-box">Key highlights</label>
          <div class="chip-input" id="highlight-box" data-target="highlight" data-sep="newline" data-max="6">
            <input type="text" placeholder="Type and press Enter…" aria-label="Add a key highlight" />
          </div>
          <input type="hidden" id="highlight" name="highlight" value="${esc(post?.highlight ?? '')}" />
          <p class="hint">
            Press <strong>Enter</strong> after each one, <strong>×</strong> to remove.
            Short entries render as highlight chips on the post; full sentences
            render as a “Key takeaways” list. <span class="chip-count"></span>
          </p>
        </div>

        <div class="field">
          <label for="content">Body</label>

          <div class="toolbar-md" role="toolbar" aria-label="Formatting">
            <button type="button" data-md="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
            <button type="button" data-md="italic" title="Italic (Ctrl+I)"><em>I</em></button>
            <span class="tb-sep"></span>
            <button type="button" data-md="h2" title="Heading">H2</button>
            <button type="button" data-md="h3" title="Sub-heading">H3</button>
            <span class="tb-sep"></span>
            <button type="button" data-md="link" title="Link (Ctrl+K)">🔗</button>
            <button type="button" data-md="code" title="Inline code">&lt;/&gt;</button>
            <button type="button" data-md="codeblock" title="Code block">{ }</button>
            <button type="button" data-md="quote" title="Quote">❝</button>
            <button type="button" data-md="ul" title="Bullet list">•</button>
            <button type="button" data-md="ol" title="Numbered list">1.</button>
            <button type="button" data-md="hr" title="Divider">—</button>
            <span class="tb-sep"></span>
            <button type="button" id="btn-image" title="Upload image">🖼 Image</button>
            <button type="button" data-md="cols2" title="Two columns (image + text, or image + image)">▮▮</button>
            <button type="button" data-md="cols3" title="Three columns">▮▮▮</button>
            <button type="button" id="btn-preview" class="tb-right">Preview</button>
          </div>

          <input type="file" id="file-input" accept="image/*" hidden />

          <textarea id="content" name="content" class="mono" rows="24"
                    placeholder="Write in Markdown…">${esc(post?.content ?? '')}</textarea>

          <div id="preview" class="preview-pane" hidden></div>

          <p class="hint" id="upload-status"></p>

          <details class="md-help">
            <summary>Markdown reference</summary>
            <table class="md-table">
              <tr><td><code># H1</code> · <code>## H2</code> · <code>### H3</code></td><td>Headings — these control text size</td></tr>
              <tr><td><code>**bold**</code> · <code>*italic*</code></td><td>Emphasis</td></tr>
              <tr><td><code>[text](https://url)</code></td><td>Link</td></tr>
              <tr><td><code>![alt](/uploads/x.png)</code></td><td>Image</td></tr>
              <tr><td><code>\`code\`</code></td><td>Inline code</td></tr>
              <tr><td><code>\`\`\`cpp … \`\`\`</code></td><td>Code block with language</td></tr>
              <tr><td><code>&gt; quote</code></td><td>Blockquote</td></tr>
              <tr><td><code>- item</code> · <code>1. item</code></td><td>Lists</td></tr>
              <tr><td><code>---</code></td><td>Divider</td></tr>
              <tr><td><code>| a | b |</code></td><td>Tables (GitHub style)</td></tr>
              <tr>
                <td><code>:::columns</code> … <code>|||</code> … <code>:::</code></td>
                <td>Side-by-side columns — cells split on <code>|||</code></td>
              </tr>
            </table>
            <p class="hint">
              Columns stack vertically on phones automatically. Readers can click
              any image in a published post to view it full size.
            </p>
            <p class="hint">
              Fonts and colours come from the site theme, so every post looks consistent —
              that is deliberate. Use headings for size rather than styling text directly.
            </p>
          </details>
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

          <div class="field">
            <label for="publishedAt">Publish date and time</label>
            <input type="datetime-local" id="publishedAt" name="publishedAt"
                   value="${toLocalInput(post?.publishedAt ?? new Date().toISOString())}" />
            <p class="hint" id="schedule-hint">
              Backdate it, or set a future time to schedule it. A published post
              stays hidden until this moment arrives.
            </p>
          </div>
          <button class="btn" type="submit" style="width:100%;justify-content:center">
            ${editing ? 'Save changes' : 'Create post'}
          </button>
        </div>

        <div class="panel">
          <h3>Tags</h3>
          <div class="field" style="margin-bottom:0">
            <div class="chip-input" id="tags-box" data-target="tags" data-sep="comma" data-max="8">
              <input type="text" placeholder="Add a tag…" aria-label="Add a tag" />
            </div>
            <input type="hidden" id="tags" name="tags" value="${esc(post?.tags.join(', ') ?? '')}" />
            <p class="hint">
              Enter or comma to add, × to remove. Lowercased automatically.
              <span class="chip-count"></span>
            </p>
          </div>
        </div>
      </aside>
    </div>
  </form>
${EDITOR_JS}
${CHIP_JS}
<script>
(function () {
  var field = document.getElementById('publishedAt');
  var hint = document.getElementById('schedule-hint');
  var status = document.getElementById('status');
  if (!field || !hint) return;

  var original = hint.textContent;

  function update() {
    var chosen = new Date(field.value);
    if (isNaN(chosen.getTime())) { hint.textContent = original; return; }

    if (chosen.getTime() > Date.now()) {
      hint.textContent = status && status.value === 'published'
        ? 'Scheduled — this goes live on ' + chosen.toLocaleString() + '.'
        : 'Future date set. Switch status to Published to schedule it.';
    } else {
      hint.textContent = original;
    }
  }

  field.addEventListener('change', update);
  if (status) status.addEventListener('change', update);
  update();
})();
</script>`;

  return layout({
    title: `${editing ? 'Edit' : 'New'} post — Saidul Islam Rajib`,
    body,
    nav: adminNav('/admin/posts'),
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

  return layout({
    title: 'Sign in — Saidul Islam Rajib',
    body,
    nav: '<a href="/">Home</a>',
  });
}
