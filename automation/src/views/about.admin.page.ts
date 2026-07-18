import {
  AboutContent,
  LEARNING_STATUSES,
  LearningItem,
  Milestone,
  STATUS_LABELS,
  isOngoing,
} from '../about/about.model';
import { adminNav, esc, layout } from './layout';

const ADMIN_ABOUT_CSS = `
<style>
  .panel-block {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem;
  }
  .panel-block > summary {
    list-style: none; cursor: pointer; user-select: none;
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); font-weight: 700;
  }
  .panel-block > summary::-webkit-details-marker { display: none; }
  .panel-block > summary::after {
    content: "+"; margin-left: auto; font-size: 1.05rem; font-weight: 700;
    width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--border);
    display: grid; place-items: center; color: var(--ink-3);
  }
  .panel-block[open] > summary::after { content: "−"; }
  .panel-block[open] > summary { margin-bottom: 1rem; }
  .panel-block > summary:hover { color: var(--ink); }
  .panel-block .count {
    font-size: 0.7rem; color: var(--ink-3); font-weight: 600;
    background: var(--bg); border: 1px solid var(--border);
    padding: 0.1rem 0.45rem; border-radius: 100px; text-transform: none;
    letter-spacing: 0;
  }

  .repeat-row {
    border: 1px solid var(--border); border-radius: 10px;
    padding: 0.9rem; margin-bottom: 0.75rem; background: var(--surface);
    position: relative;
  }
  .repeat-row .row-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 0.7rem;
  }
  .repeat-row .row-num { font-size: 0.72rem; color: var(--ink-3); font-weight: 700; }
  .remove-row {
    background: transparent; border: 1px solid var(--border); border-radius: 7px;
    color: var(--ink-3); cursor: pointer; font-family: inherit;
    font-size: 0.76rem; padding: 0.2rem 0.55rem;
  }
  .remove-row:hover { color: var(--danger); border-color: var(--danger); }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .grid-3 { display: grid; grid-template-columns: 0.8fr 1.4fr auto; gap: 0.6rem; align-items: start; }
  @media (max-width: 700px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }
  .repeat-row input, .repeat-row textarea, .repeat-row select { margin-bottom: 0.5rem; }
  .repeat-row label { font-size: 0.74rem; margin-bottom: 0.25rem; }
  .add-row {
    background: transparent; border: 1px dashed var(--border); border-radius: 9px;
    color: var(--ink-2); cursor: pointer; font-family: inherit;
    font-size: 0.84rem; padding: 0.55rem 0.9rem; width: 100%;
  }
  .add-row:hover { border-color: var(--accent); color: var(--accent); }
  .empty-rows { font-size: 0.82rem; color: var(--ink-3); margin-bottom: 0.75rem; }

  .gallery-admin { display: grid; grid-template-columns: 90px 1fr auto; gap: 0.7rem; align-items: center; }
  .gallery-admin img {
    width: 90px; height: 68px; object-fit: cover;
    border-radius: 8px; border: 1px solid var(--border);
  }
  .upload-zone {
    border: 1px dashed var(--border); border-radius: 10px;
    padding: 1.1rem; text-align: center; color: var(--ink-3);
    font-size: 0.86rem; cursor: pointer; margin-bottom: 0.75rem;
  }
  .upload-zone:hover, .upload-zone.dragover { border-color: var(--accent); color: var(--accent); }

  .mini-toolbar {
    display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.3rem 0.35rem;
    border: 1px solid var(--border); border-bottom: 0;
    border-radius: 7px 7px 0 0; background: var(--surface-2);
  }
  .mini-toolbar button {
    background: transparent; border: 1px solid transparent; border-radius: 5px;
    color: var(--ink-3); font-family: inherit; font-size: 0.8rem;
    padding: 0.2rem 0.45rem; cursor: pointer; line-height: 1.2;
  }
  .mini-toolbar button:hover {
    background: var(--bg); border-color: var(--border); color: var(--ink);
  }
  .mini-toolbar .mk {
    background: color-mix(in srgb, var(--accent) 30%, transparent);
    padding: 0 0.2rem; border-radius: 3px;
  }
  .mini-toolbar + textarea { border-radius: 0 0 7px 7px; margin-bottom: 0.5rem; }

  /* ---------- date range ---------- */
  .date-range {
    display: flex; align-items: flex-end; gap: 0.6rem;
    margin-bottom: 0.6rem; flex-wrap: wrap;
  }
  .date-field { flex: 1; min-width: 150px; }
  .date-field label {
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--ink-3); font-weight: 700; margin-bottom: 0.3rem;
  }
  .date-field input {
    margin: 0; border-radius: 9px; padding: 0.55rem 0.7rem;
    background: var(--surface); font-variant-numeric: tabular-nums;
  }
  .date-field.is-open input {
    opacity: 0.45; background: var(--surface-2); pointer-events: none;
  }
  .range-arrow { color: var(--ink-3); padding-bottom: 0.65rem; font-size: 0.95rem; }

  .current-toggle {
    display: inline-flex; align-items: center; gap: 0.45rem;
    font-size: 0.85rem; font-weight: 500; color: var(--ink-2);
    cursor: pointer; margin-bottom: 0.5rem; user-select: none;
  }
  .current-toggle input { width: auto; margin: 0; cursor: pointer; }

  .period-preview {
    font-size: 0.8rem; color: var(--ink-3); margin-bottom: 0.75rem;
    min-height: 1.2em;
  }
  .period-preview strong {
    color: var(--accent); font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
</style>`;

function rowHead(label: string): string {
  return `<div class="row-head">
    <span class="row-num">${label}</span>
    <button type="button" class="remove-row">Remove</button>
  </div>`;
}

export function aboutAdminPage(about: AboutContent, saved = false): string {
  const milestoneRow = (
    m: Milestone = {
      period: '',
      title: '',
      org: '',
      description: '',
      startDate: '',
      endDate: '',
    },
  ) => `
  <div class="repeat-row">
    ${rowHead('Milestone')}
    <div class="grid-2">
      <div>
        <label>Title</label>
        <input type="text" name="milestoneTitle" value="${esc(m.title)}" placeholder="Software Engineer" />
      </div>
      <div>
        <label>Organisation / place</label>
        <input type="text" name="milestoneOrg" value="${esc(m.org)}" placeholder="Company, university, self-taught" />
      </div>
    </div>

    <div class="date-range">
      <div class="date-field">
        <label>Start</label>
        <input type="month" name="milestoneStart" value="${esc(m.startDate)}" />
      </div>

      <span class="range-arrow" aria-hidden="true">→</span>

      <div class="date-field end-field">
        <label>End</label>
        <input type="month" name="milestoneEnd" value="${esc(m.endDate)}" />
      </div>
    </div>

    <label class="current-toggle">
      <input type="checkbox" class="current-check" ${isOngoing(m) ? 'checked' : ''} />
      <span>I am currently here</span>
    </label>

    <p class="period-preview" aria-live="polite"></p>

    <label>What happened</label>
    <div class="mini-toolbar" role="toolbar" aria-label="Formatting">
      <button type="button" data-fmt="bold" title="Bold"><strong>B</strong></button>
      <button type="button" data-fmt="italic" title="Italic"><em>I</em></button>
      <button type="button" data-fmt="mark" title="Highlight"><span class="mk">H</span></button>
      <button type="button" data-fmt="ul" title="Bullet list">•</button>
      <button type="button" data-fmt="ol" title="Numbered list">1.</button>
      <button type="button" data-fmt="link" title="Link">🔗</button>
      <button type="button" data-fmt="code" title="Code">&lt;/&gt;</button>
    </div>
    <textarea name="milestoneDescription" rows="4"
              placeholder="What you did. **bold**, *italic*, ==highlight==, - bullets">${esc(m.description)}</textarea>
  </div>`;

  const skillRow = (g = { name: '', items: [] as string[] }) => `
  <div class="repeat-row">
    ${rowHead('Group')}
    <label>Group name</label>
    <input type="text" name="skillGroupName" value="${esc(g.name)}" placeholder="Backend" />
    <label>Items</label>
    <input type="text" name="skillGroupItems" value="${esc(g.items.join(', '))}" placeholder="NestJS, PostgreSQL, Redis" />
    <p class="hint">Comma separated.</p>
  </div>`;

  const learningRow = (
    l: LearningItem = { title: '', note: '', status: 'learning' },
  ) => `
  <div class="repeat-row">
    ${rowHead('Item')}
    <div class="grid-2">
      <div>
        <label>Topic</label>
        <input type="text" name="learningTitle" value="${esc(l.title)}" placeholder="Kubernetes" />
      </div>
      <div>
        <label>Status</label>
        <select name="learningStatus">
          ${LEARNING_STATUSES.map(
            (st) =>
              `<option value="${st}" ${l.status === st ? 'selected' : ''}>${STATUS_LABELS[st]}</option>`,
          ).join('')}
        </select>
      </div>
    </div>
    <label>Note</label>
    <input type="text" name="learningNote" value="${esc(l.note)}" placeholder="Why, or what you want to build with it" />
  </div>`;

  const galleryRow = (g = { url: '', caption: '' }) => `
  <div class="repeat-row">
    <div class="gallery-admin">
      <img src="${esc(g.url)}" alt="" />
      <div>
        <input type="hidden" name="galleryUrl" value="${esc(g.url)}" />
        <label>Caption</label>
        <input type="text" name="galleryCaption" value="${esc(g.caption)}" placeholder="Where and when" />
      </div>
      <button type="button" class="remove-row">Remove</button>
    </div>
  </div>`;

  const socialRow = (l = { label: '', url: '' }) => `
  <div class="repeat-row">
    <div class="grid-3">
      <input type="text" name="socialLabel" value="${esc(l.label)}" placeholder="LinkedIn" />
      <input type="text" name="socialUrl" value="${esc(l.url)}" placeholder="https://linkedin.com/in/…" />
      <button type="button" class="remove-row">Remove</button>
    </div>
  </div>`;

  const section = (
    id: string,
    title: string,
    count: number,
    rows: string,
    addLabel: string,
    extra = '',
  ) => `
  <details class="panel-block" open data-panel="${id}">
    <summary>${title} <span class="count">${count}</span></summary>
    ${extra}
    <div class="repeat-list" id="list-${id}">
      ${rows || `<p class="empty-rows">Nothing added yet.</p>`}
    </div>
    <button type="button" class="add-row" data-add="${id}">＋ ${addLabel}</button>
  </details>`;

  const body = `
${ADMIN_ABOUT_CSS}
  ${saved ? '<div class="flash ok">About page saved.</div>' : ''}

  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin">← Back to dashboard</a>
      <h1 class="page-title" style="margin-bottom:.15rem">About page</h1>
      <p style="color:var(--ink-3);font-size:.9rem">
        Your story, journey, topics, learning plans and photos.
        <a href="/about" style="color:var(--accent)">View page →</a>
      </p>
    </div>
  </div>

  <form method="post" action="/admin/about">
    <details class="panel-block" open data-panel="intro">
      <summary>Headline and intro</summary>
      <div class="field">
        <label for="headline">Headline</label>
        <input type="text" id="headline" name="headline" value="${esc(about.headline)}"
               placeholder="Leave blank to use your name" />
      </div>
      <div class="field" style="margin-bottom:0">
        <label for="intro">Intro</label>
        <textarea id="intro" name="intro" rows="8" class="mono"
                  placeholder="Markdown supported — who you are, what you work on, what you care about">${esc(about.intro)}</textarea>
        <p class="hint">Markdown: <code>**bold**</code>, <code>[link](url)</code>, <code>## heading</code>, lists.</p>
      </div>
    </details>

    ${section(
      'milestones',
      'Journey',
      about.milestones.length,
      about.milestones.map((m) => milestoneRow(m)).join(''),
      'Add milestone',
    )}

    ${section(
      'skills',
      'Topics covered',
      about.skillGroups.length,
      about.skillGroups.map((g) => skillRow(g)).join(''),
      'Add group',
    )}

    ${section(
      'learning',
      'Learning curve',
      about.learning.length,
      about.learning.map((l) => learningRow(l)).join(''),
      'Add topic',
    )}

    ${section(
      'gallery',
      'Photos',
      about.gallery.length,
      about.gallery.map((g) => galleryRow(g)).join(''),
      'Add by URL',
      `<div class="upload-zone" id="photo-zone">
        Click to upload, or drag photos here
        <input type="file" id="photo-input" accept="image/*" multiple hidden />
      </div>
      <p class="hint" id="photo-status" style="margin-bottom:.75rem"></p>`,
    )}

    ${section(
      'socials',
      'Social links',
      about.socials.length,
      about.socials.map((l) => socialRow(l)).join(''),
      'Add link',
    )}

    <button class="btn" type="submit" style="width:100%;justify-content:center;padding:.7rem">
      Save about page
    </button>
  </form>

<script>
(function () {
  var templates = {
    milestones: ${JSON.stringify(milestoneRow())},
    skills: ${JSON.stringify(skillRow())},
    learning: ${JSON.stringify(learningRow())},
    gallery: ${JSON.stringify(galleryRow())},
    socials: ${JSON.stringify(socialRow())}
  };

  function listOf(id) { return document.getElementById('list-' + id); }

  function clearPlaceholder(list) {
    var placeholder = list.querySelector('.empty-rows');
    if (placeholder) placeholder.remove();
  }

  document.querySelectorAll('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-add');
      var list = listOf(id);
      clearPlaceholder(list);
      list.insertAdjacentHTML('beforeend', templates[id]);
      var added = list.lastElementChild;
      var firstInput = added.querySelector('input, textarea');
      if (firstInput) firstInput.focus();
    });
  });

  // Delegated so rows added after load are covered too.
  document.addEventListener('click', function (ev) {
    if (!ev.target.classList.contains('remove-row')) return;
    var row = ev.target.closest('.repeat-row');
    if (row) row.remove();
  });

  // ---------- photo upload ----------
  var zone = document.getElementById('photo-zone');
  var input = document.getElementById('photo-input');
  var status = document.getElementById('photo-status');

  function addPhoto(url) {
    var list = listOf('gallery');
    clearPlaceholder(list);
    list.insertAdjacentHTML('beforeend', templates.gallery);
    var row = list.lastElementChild;
    row.querySelector('input[name=galleryUrl]').value = url;
    row.querySelector('img').src = url;
  }

  function upload(files) {
    if (!files || !files.length) return;
    var remaining = files.length;
    status.textContent = 'Uploading ' + remaining + ' photo(s)…';

    Array.prototype.forEach.call(files, function (file) {
      var data = new FormData();
      data.append('file', file);

      fetch('/admin/uploads', { method: 'POST', body: data, credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || 'Upload failed'); });
          return r.json();
        })
        .then(function (j) {
          addPhoto(j.url);
          remaining--;
          status.textContent = remaining > 0
            ? 'Uploading ' + remaining + ' more…'
            : 'Uploaded. Save the page to keep them.';
        })
        .catch(function (err) {
          remaining--;
          status.textContent = 'Upload failed: ' + err.message;
        });
    });
  }

  zone.addEventListener('click', function () { input.click(); });
  input.addEventListener('change', function () { upload(input.files); input.value = ''; });
  zone.addEventListener('dragover', function (ev) { ev.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
  zone.addEventListener('drop', function (ev) {
    ev.preventDefault();
    zone.classList.remove('dragover');
    upload(ev.dataTransfer.files);
  });

  // ---------- formatting toolbar ----------
  // Delegated: milestone rows are added after load, so per-button listeners
  // bound at startup would miss them.
  function applyFormat(area, kind) {
    var s = area.selectionStart, e = area.selectionEnd;
    var sel = area.value.slice(s, e);

    function surround(before, after) {
      area.value = area.value.slice(0, s) + before + sel + after + area.value.slice(e);
      area.focus();
      area.setSelectionRange(s + before.length, s + before.length + sel.length);
    }

    function prefixLines(prefix) {
      var lineStart = area.value.lastIndexOf('\n', s - 1) + 1;
      var block = area.value.slice(lineStart, e) || sel;
      var n = 0;
      var out = block.split('\n').map(function (line) {
        n++;
        return (prefix === '1. ' ? n + '. ' : prefix) + line;
      }).join('\n');
      area.value = area.value.slice(0, lineStart) + out + area.value.slice(e);
      area.focus();
      area.setSelectionRange(lineStart, lineStart + out.length);
    }

    if (kind === 'bold') surround('**', '**');
    else if (kind === 'italic') surround('*', '*');
    else if (kind === 'mark') surround('==', '==');
    else if (kind === 'code') surround('\`', '\`');
    else if (kind === 'ul') prefixLines('- ');
    else if (kind === 'ol') prefixLines('1. ');
    else if (kind === 'link') {
      var url = prompt('Link URL:', 'https://');
      if (url) surround('[', '](' + url + ')');
    }
  }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-fmt]');
    if (!btn) return;

    var toolbar = btn.closest('.mini-toolbar');
    var area = toolbar && toolbar.parentNode.querySelector('textarea');
    if (area) applyFormat(area, btn.getAttribute('data-fmt'));
  });

  // Ctrl+B / Ctrl+I inside any milestone description.
  document.addEventListener('keydown', function (ev) {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    var area = ev.target;
    if (area.tagName !== 'TEXTAREA' || area.name !== 'milestoneDescription') return;

    var key = ev.key.toLowerCase();
    if (key === 'b') { ev.preventDefault(); applyFormat(area, 'bold'); }
    if (key === 'i') { ev.preventDefault(); applyFormat(area, 'italic'); }
  });

  // ---------- date range ----------
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function label(value) {
    var m = /^(\\d{4})-(\\d{2})/.exec(value || '');
    if (!m) return '';
    return MONTHS[Number(m[2]) - 1] + ' ' + m[1];
  }

  // Reflects exactly what milestonePeriod() will produce on the public page.
  function refreshRange(row) {
    var start = row.querySelector('input[name=milestoneStart]');
    var end = row.querySelector('input[name=milestoneEnd]');
    var check = row.querySelector('.current-check');
    var endField = end.closest('.date-field');
    var preview = row.querySelector('.period-preview');
    if (!start || !end || !check || !preview) return;

    if (check.checked) {
      // Clearing rather than disabling: a disabled input submits nothing,
      // which would misalign the parallel form arrays.
      end.value = '';
      end.readOnly = true;
      endField.classList.add('is-open');
    } else {
      end.readOnly = false;
      endField.classList.remove('is-open');
    }

    var from = label(start.value);
    if (!from) {
      preview.innerHTML = 'Pick a start month to build the label.';
      return;
    }

    var to = check.checked || !end.value ? 'Present' : label(end.value);
    preview.innerHTML = 'Shows as <strong>' + from + ' — ' + to + '</strong>';
  }

  function refreshAll() {
    document.querySelectorAll('#list-milestones .repeat-row').forEach(refreshRange);
  }

  // Delegated: milestone rows can be added after load.
  document.addEventListener('change', function (ev) {
    var row = ev.target.closest('#list-milestones .repeat-row');
    if (row) refreshRange(row);
  });
  document.addEventListener('input', function (ev) {
    var row = ev.target.closest('#list-milestones .repeat-row');
    if (row) refreshRange(row);
  });

  var addButton = document.querySelector('[data-add="milestones"]');
  if (addButton) addButton.addEventListener('click', function () {
    setTimeout(refreshAll, 0);
  });

  refreshAll();

  // Remember collapsed panels.
  document.querySelectorAll('.panel-block[data-panel]').forEach(function (panel) {
    var key = 'about-panel-' + panel.getAttribute('data-panel');
    try {
      if (localStorage.getItem(key) === 'closed') panel.open = false;
    } catch (e) { /* storage blocked */ }
    panel.addEventListener('toggle', function () {
      try { localStorage.setItem(key, panel.open ? 'open' : 'closed'); } catch (e) {}
    });
  });
})();
</script>`;

  return layout({
    title: 'About page — admin',
    body,
    nav: adminNav('/admin/about'),
    variant: 'admin',
  });
}
