import { SiteSettings } from '../settings/settings.model';
import { adminNav, avatarMark, esc, layout } from './layout';

export function settingsPage(s: SiteSettings, saved = false): string {
  const linkRows = [
    ...s.footerLinks,
    { label: '', url: '' },
    { label: '', url: '' },
  ];

  const body = `
<style>
  .settings-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1.75rem; align-items: start; }
  @media (max-width: 860px) { .settings-grid { grid-template-columns: 1fr; } }
  .card-block {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem;
  }
  .card-block h3 {
    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); margin-bottom: 1rem;
  }
  .avatar-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
  .avatar-preview {
    width: 64px; height: 64px; border-radius: 50%;
    background: var(--accent); color: var(--accent-ink);
    display: grid; place-items: center; font-weight: 800; font-size: 1.15rem;
    flex-shrink: 0; overflow: hidden;
  }
  .avatar-preview.avatar-img { object-fit: cover; }
  .link-row { display: grid; grid-template-columns: 1fr 1.6fr auto; gap: 0.5rem; margin-bottom: 0.5rem; }
  .link-row input { margin: 0; }
  .link-row button {
    background: transparent; border: 1px solid var(--border); border-radius: 8px;
    color: var(--ink-3); cursor: pointer; padding: 0 0.7rem; font-family: inherit;
  }
  .link-row button:hover { color: var(--danger); border-color: var(--danger); }
  .preview-footer {
    border-top: 1px solid var(--border); padding-top: 0.9rem; margin-top: 0.9rem;
    font-size: 0.83rem; color: var(--ink-3);
  }
  .preview-footer a { color: var(--accent); }
</style>

  ${saved ? '<div class="flash ok">Settings saved.</div>' : ''}

  <div class="toolbar">
    <div>
      <h1 class="page-title" style="margin-bottom:.15rem">Settings</h1>
      <p style="color:var(--ink-3);font-size:.9rem">Profile, site identity and footer.</p>
    </div>
    <a class="btn btn-ghost" href="/admin" style="margin-left:auto">Back to dashboard</a>
  </div>

  <form method="post" action="/admin/settings">
    <div class="settings-grid">
      <div>
        <div class="card-block">
          <h3>Profile</h3>

          <div class="avatar-row">
            ${avatarMark(s.avatarUrl, s.authorName, 'avatar-preview')}
            <div style="flex:1">
              <input type="file" id="avatar-file" accept="image/*" hidden />
              <button type="button" class="btn btn-ghost btn-sm" id="avatar-btn">Upload photo</button>
              ${s.avatarUrl ? '<button type="button" class="btn btn-ghost btn-sm" id="avatar-clear">Remove</button>' : ''}
              <p class="hint" id="avatar-status">Square images work best. Max 5MB.</p>
            </div>
          </div>

          <input type="hidden" id="avatarUrl" name="avatarUrl" value="${esc(s.avatarUrl)}" />

          <div class="field">
            <label for="authorName">Name</label>
            <input type="text" id="authorName" name="authorName" required value="${esc(s.authorName)}" />
            <p class="hint">Shown in the header and on every article byline.</p>
          </div>

          <div class="field">
            <label for="authorRole">Role</label>
            <input type="text" id="authorRole" name="authorRole" value="${esc(s.authorRole)}"
                   placeholder="Software Engineer" />
          </div>

          <div class="field" style="margin-bottom:0">
            <label for="authorBio">Short bio</label>
            <textarea id="authorBio" name="authorBio" rows="3"
                      placeholder="One or two lines about you">${esc(s.authorBio)}</textarea>
          </div>
        </div>

        <div class="card-block">
          <h3>Site</h3>

          <div class="field">
            <label for="siteTitle">Home page heading</label>
            <input type="text" id="siteTitle" name="siteTitle" value="${esc(s.siteTitle)}" />
          </div>

          <div class="field" style="margin-bottom:0">
            <label for="siteTagline">Tagline</label>
            <textarea id="siteTagline" name="siteTagline" rows="2">${esc(s.siteTagline)}</textarea>
            <p class="hint">The sentence under the heading on the home page.</p>
          </div>
        </div>

        <div class="card-block">
          <h3>Footer</h3>

          <div class="field">
            <label for="footerOwner">Owner name</label>
            <input type="text" id="footerOwner" name="footerOwner" value="${esc(s.footerOwner)}"
                   placeholder="Team Sober" />
          </div>

          <div class="field">
            <label for="footerOwnerUrl">Owner link</label>
            <input type="text" id="footerOwnerUrl" name="footerOwnerUrl" value="${esc(s.footerOwnerUrl)}"
                   placeholder="https://linkedin.com/in/your-handle" />
            <p class="hint">Where the owner name links to. Your LinkedIn, for example.</p>
          </div>

          <div class="field">
            <label for="footerSuffix">Text after the name</label>
            <input type="text" id="footerSuffix" name="footerSuffix" value="${esc(s.footerSuffix)}"
                   placeholder="All rights reserved." />
          </div>

          <label>Footer links</label>
          <div id="link-rows">
            ${linkRows
              .map(
                (link) => `
            <div class="link-row">
              <input type="text" name="linkLabel" placeholder="Label" value="${esc(link.label)}" />
              <input type="text" name="linkUrl" placeholder="/path or https://…" value="${esc(link.url)}" />
              <button type="button" class="remove-link" aria-label="Clear row">×</button>
            </div>`,
              )
              .join('')}
          </div>
          <p class="hint">
            Blank rows are ignored. Up to 6 links. Only <code>/paths</code> and
            <code>http(s)</code> URLs are accepted.
          </p>
        </div>
      </div>

      <aside>
        <div class="card-block">
          <h3>Preview</h3>
          <div style="display:flex;align-items:center;gap:.6rem">
            ${avatarMark(s.avatarUrl, s.authorName, 'mark')}
            <div>
              <div style="font-weight:600;color:var(--ink);font-size:.92rem">${esc(s.authorName)}</div>
              <div style="font-size:.8rem;color:var(--ink-3)">${esc(s.authorRole)}</div>
            </div>
          </div>

          <div class="preview-footer">
            © ${new Date().getFullYear()}.
            ${s.footerOwner ? `<a href="#">${esc(s.footerOwner)}</a>.` : ''}
            ${esc(s.footerSuffix)}
            <div style="margin-top:.4rem">
              ${s.footerLinks.map((l) => `<a href="#">${esc(l.label)}</a>`).join(' · ')}
            </div>
          </div>
        </div>

        <div class="card-block">
          <h3>Save</h3>
          <button class="btn" type="submit" style="width:100%;justify-content:center">
            Save settings
          </button>
          <p class="hint" style="margin-top:.6rem">
            Stored on the data volume, so changes survive redeploys.
          </p>
        </div>
      </aside>
    </div>
  </form>

<script>
(function () {
  var fileInput = document.getElementById('avatar-file');
  var hidden = document.getElementById('avatarUrl');
  var status = document.getElementById('avatar-status');
  var clear = document.getElementById('avatar-clear');

  document.getElementById('avatar-btn').addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0];
    if (!file) return;

    status.textContent = 'Uploading…';
    var data = new FormData();
    data.append('file', file);

    fetch('/admin/uploads', { method: 'POST', body: data, credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || 'Upload failed'); });
        return r.json();
      })
      .then(function (j) {
        hidden.value = j.url;
        status.textContent = 'Uploaded. Save settings to apply.';
      })
      .catch(function (err) { status.textContent = 'Upload failed: ' + err.message; });
  });

  if (clear) {
    clear.addEventListener('click', function () {
      hidden.value = '';
      status.textContent = 'Photo cleared. Save settings to apply.';
    });
  }

  document.getElementById('link-rows').addEventListener('click', function (ev) {
    if (!ev.target.classList.contains('remove-link')) return;
    var row = ev.target.closest('.link-row');
    row.querySelectorAll('input').forEach(function (i) { i.value = ''; });
  });
})();
</script>`;

  return layout({
    title: 'Settings — ' + s.authorName,
    body,
    nav: adminNav(),
    variant: 'admin',
  });
}
