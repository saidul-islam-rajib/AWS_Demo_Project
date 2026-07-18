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
  /* Native <details> so panels stay keyboard accessible and collapsed
     fields still submit with the form. */
  .card-block > summary {
    list-style: none; cursor: pointer; user-select: none;
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); font-weight: 700;
  }
  .card-block > summary::-webkit-details-marker { display: none; }
  .card-block > summary::after {
    content: "+"; margin-left: auto;
    font-size: 1.05rem; line-height: 1; font-weight: 700;
    color: var(--ink-3);
    width: 22px; height: 22px; border-radius: 6px;
    border: 1px solid var(--border);
    display: grid; place-items: center;
  }
  .card-block[open] > summary::after { content: "−"; }
  .card-block > summary:hover { color: var(--ink); }
  .card-block > summary:hover::after { color: var(--ink); border-color: var(--accent); }
  .card-block > summary:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px;
  }
  .card-block[open] > summary { margin-bottom: 1rem; }
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
        <details class="card-block" open data-panel="profile">
          <summary>Profile</summary>

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
            <p class="hint">
              Used as the description when a link is shared on LinkedIn,
              Facebook or X, and by search engines. It is not printed on the
              page, so it does not duplicate the About intro. Around 150
              characters reads best.
            </p>
          </div>
        </details>

        <details class="card-block" open data-panel="site">
          <summary>Site</summary>

          <div class="field">
            <label for="siteTitle">Home page heading</label>
            <input type="text" id="siteTitle" name="siteTitle" value="${esc(s.siteTitle)}" />
          </div>

          <div class="field">
            <label for="siteUrl">Public site URL</label>
            <input type="text" id="siteUrl" name="siteUrl" value="${esc(s.siteUrl)}"
                   placeholder="https://example.com" />
            <p class="hint">Used for link previews on Facebook, LinkedIn and X. Must be absolute.</p>
          </div>

          <div class="field">
            <label for="shareIntro">Sharing intro</label>
            <textarea id="shareIntro" name="shareIntro" rows="3"
                      placeholder="What someone should know about you in one or two sentences">${esc(s.shareIntro)}</textarea>
            <p class="hint">
              The line under the title when you share a link on Facebook,
              LinkedIn or WhatsApp. Around 160 characters shows in full; more
              than that gets cut off mid-sentence. A post or project uses its
              own summary instead. Leave it empty to fall back to your bio.
            </p>
          </div>

          <div class="field">
            <label for="githubUser">GitHub username</label>
            <input type="text" id="githubUser" name="githubUser" value="${esc(s.githubUser)}"
                   placeholder="saidul-islam-rajib" />
            <p class="hint">Enables importing your public repositories as projects.</p>
          </div>

          <div class="field">
            <label for="siteTagline">Tagline</label>
            <textarea id="siteTagline" name="siteTagline" rows="2">${esc(s.siteTagline)}</textarea>
            <p class="hint">The sentence under the heading on the home page.</p>
          </div>

          <div class="field" style="margin-bottom:0">
            <label style="display:flex;align-items:center;gap:.5rem;font-weight:500">
              <input type="checkbox" name="showIntro" value="true"
                     style="width:auto" ${s.showIntro ? 'checked' : ''} />
              Show the intro block on the home page
            </label>
            <p class="hint">
              Turn this off to open straight into the posts. The heading and
              tagline still appear on tag and search pages.
            </p>
          </div>
        </details>

        <details class="card-block" open data-panel="footer">
          <summary>Footer</summary>

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
        </details>
      </div>

      <aside>
        <details class="card-block" open data-panel="save">
          <summary>Save</summary>
          <button class="btn" type="submit" style="width:100%;justify-content:center">
            Save settings
          </button>
          <p class="hint" style="margin-top:.6rem">
            Stored on the data volume, so changes survive redeploys.
          </p>
        </details>

        <details class="card-block" open data-panel="preview">
          <summary>Preview</summary>
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
        </details>


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

  // Remember which panels are collapsed across reloads.
  document.querySelectorAll('.card-block[data-panel]').forEach(function (panel) {
    var key = 'settings-panel-' + panel.getAttribute('data-panel');

    try {
      if (localStorage.getItem(key) === 'closed') panel.open = false;
    } catch (e) { /* storage blocked; panels just stay open */ }

    panel.addEventListener('toggle', function () {
      try {
        localStorage.setItem(key, panel.open ? 'open' : 'closed');
      } catch (e) { /* ignore */ }
    });
  });
})();
</script>`;

  return layout({
    title: 'Settings — ' + s.authorName,
    body,
    nav: adminNav('/admin/settings'),
    variant: 'admin',
  });
}
