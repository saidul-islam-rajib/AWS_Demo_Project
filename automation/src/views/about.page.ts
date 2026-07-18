import {
  AboutContent,
  STATUS_LABELS,
  isAboutEmpty,
} from '../about/about.model';
import { getSettings } from '../settings/settings.store';
import { avatarMark, esc, layout } from './layout';

const ABOUT_CSS = `
<style>
  .about-hero {
    display: flex; align-items: center; gap: 1.25rem;
    padding-bottom: 2rem; margin-bottom: 2.5rem;
    border-bottom: 1px solid var(--border); flex-wrap: wrap;
  }
  .about-avatar {
    width: 96px; height: 96px; border-radius: 50%;
    background: var(--accent); color: var(--accent-ink);
    display: grid; place-items: center;
    font-size: 1.9rem; font-weight: 800; flex-shrink: 0; overflow: hidden;
  }
  .about-avatar.avatar-img { object-fit: cover; }
  .about-hero h1 {
    font-family: var(--serif); font-size: clamp(1.9rem, 5vw, 2.6rem);
    line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 0.3rem;
  }
  .about-hero .role { color: var(--ink-3); font-size: 1rem; }
  .socials { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.85rem; }
  .social-link {
    font-size: 0.82rem; padding: 0.3rem 0.75rem; border-radius: 100px;
    border: 1px solid var(--border); color: var(--ink-2);
  }
  .social-link:hover { border-color: var(--accent); color: var(--accent); }

  .about-section { margin-bottom: 3rem; }
  .about-section > h2 {
    font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.09em;
    color: var(--ink-3); font-weight: 700;
    padding-bottom: 0.7rem; margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .about-intro {
    font-family: var(--serif); font-size: 1.12rem; line-height: 1.75;
    color: var(--ink-2); max-width: 36em;
  }
  .about-intro > * + * { margin-top: 1.1rem; }
  .about-intro a { color: var(--accent); text-decoration: underline; }
  .about-intro code {
    font-family: var(--mono); font-size: 0.86em; background: var(--surface-2);
    border: 1px solid var(--border); padding: 0.1em 0.35em; border-radius: 5px;
  }

  /* ---------- timeline ---------- */
  .timeline { position: relative; padding-left: 1.6rem; }
  .timeline:before {
    content: ""; position: absolute; left: 5px; top: 6px; bottom: 6px;
    width: 2px; background: var(--border);
  }
  .milestone { position: relative; padding-bottom: 1.75rem; }
  .milestone:last-child { padding-bottom: 0; }
  .milestone:before {
    content: ""; position: absolute; left: -1.6rem; top: 5px;
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--bg); border: 2px solid var(--accent);
  }
  .milestone .period {
    font-size: 0.76rem; font-weight: 700; letter-spacing: 0.04em;
    color: var(--accent); text-transform: uppercase;
  }
  .milestone h3 { font-size: 1.08rem; margin: 0.25rem 0 0.15rem; }
  .milestone .org { font-size: 0.86rem; color: var(--ink-3); margin-bottom: 0.5rem; }
  .milestone p { font-size: 0.94rem; line-height: 1.65; max-width: 40em; }

  /* ---------- skills ---------- */
  .skill-groups { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
  .skill-group {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.1rem 1.15rem;
  }
  .skill-group h3 {
    font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--accent); margin-bottom: 0.7rem;
  }
  .skill-group .tag-row { gap: 0.35rem; }

  /* ---------- learning ---------- */
  .learning-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
  .learn-card {
    border: 1px solid var(--border); border-radius: 12px;
    padding: 1rem 1.1rem; background: var(--surface-2);
  }
  .learn-card .status {
    display: inline-block; font-size: 0.68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 0.15rem 0.5rem; border-radius: 100px;
    border: 1px solid currentColor; margin-bottom: 0.55rem;
  }
  .status-learning { color: var(--accent); }
  .status-planned { color: var(--warn); }
  .status-done { color: var(--good); }
  .learn-card h3 { font-size: 1rem; margin-bottom: 0.25rem; }
  .learn-card p { font-size: 0.88rem; color: var(--ink-3); line-height: 1.6; }

  /* ---------- gallery ---------- */
  .gallery { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .gallery figure { margin: 0; }
  .gallery img {
    width: 100%; aspect-ratio: 4 / 3; object-fit: cover;
    border-radius: 10px; border: 1px solid var(--border);
    cursor: zoom-in; display: block;
  }
  .gallery figcaption {
    font-size: 0.78rem; color: var(--ink-3); margin-top: 0.4rem; line-height: 1.45;
  }

  @media (max-width: 600px) {
    .about-avatar { width: 72px; height: 72px; font-size: 1.5rem; }
    .gallery { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  }

  /* ---------- lightbox ---------- */
  .lightbox {
    position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,.9);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem; cursor: zoom-out;
  }
  .lightbox img { max-width: 100%; max-height: 100%; border-radius: 6px; cursor: default; }
  .lightbox-close {
    position: absolute; top: 1rem; right: 1.25rem; background: transparent;
    border: 0; color: #fff; font-size: 2rem; line-height: 1; cursor: pointer;
    opacity: .8; font-family: inherit;
  }
  .lightbox-close:hover { opacity: 1; }
</style>`;

const GALLERY_JS = `
<script>
(function () {
  var open = null;

  function close() {
    if (!open) return;
    open.remove();
    open = null;
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function (ev) {
    var img = ev.target.closest('.gallery img');

    if (img) {
      if (open) return;
      var box = document.createElement('div');
      box.className = 'lightbox';

      var full = document.createElement('img');
      full.src = img.src;
      full.alt = img.alt || '';
      box.appendChild(full);

      var btn = document.createElement('button');
      btn.className = 'lightbox-close';
      btn.type = 'button';
      btn.innerHTML = '&times;';
      btn.setAttribute('aria-label', 'Close');
      box.appendChild(btn);

      document.body.appendChild(box);
      document.body.style.overflow = 'hidden';
      open = box;
      return;
    }

    if (open && ev.target.tagName !== 'IMG') close();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') close();
  });
})();
</script>`;

export function aboutPage(
  about: AboutContent,
  introHtml: string,
  isAdmin = false,
): string {
  const s = getSettings();

  const sections: string[] = [];

  if (about.intro.trim()) {
    sections.push(`
  <section class="about-section">
    <h2>About</h2>
    <div class="about-intro">${introHtml}</div>
  </section>`);
  }

  if (about.milestones.length) {
    sections.push(`
  <section class="about-section">
    <h2>Journey</h2>
    <div class="timeline">
      ${about.milestones
        .map(
          (m) => `<div class="milestone">
        ${m.period ? `<div class="period">${esc(m.period)}</div>` : ''}
        <h3>${esc(m.title)}</h3>
        ${m.org ? `<div class="org">${esc(m.org)}</div>` : ''}
        ${m.description ? `<p>${esc(m.description)}</p>` : ''}
      </div>`,
        )
        .join('')}
    </div>
  </section>`);
  }

  if (about.skillGroups.length) {
    sections.push(`
  <section class="about-section">
    <h2>Topics covered</h2>
    <div class="skill-groups">
      ${about.skillGroups
        .map(
          (g) => `<div class="skill-group">
        <h3>${esc(g.name)}</h3>
        <div class="tag-row">
          ${g.items.map((i) => `<span class="tag">${esc(i)}</span>`).join('')}
        </div>
      </div>`,
        )
        .join('')}
    </div>
  </section>`);
  }

  if (about.learning.length) {
    sections.push(`
  <section class="about-section">
    <h2>Learning curve</h2>
    <div class="learning-grid">
      ${about.learning
        .map(
          (l) => `<div class="learn-card">
        <span class="status status-${esc(l.status)}">${esc(STATUS_LABELS[l.status])}</span>
        <h3>${esc(l.title)}</h3>
        ${l.note ? `<p>${esc(l.note)}</p>` : ''}
      </div>`,
        )
        .join('')}
    </div>
  </section>`);
  }

  if (about.gallery.length) {
    sections.push(`
  <section class="about-section">
    <h2>Photos</h2>
    <div class="gallery">
      ${about.gallery
        .map(
          (g) => `<figure>
        <img src="${esc(g.url)}" alt="${esc(g.caption || 'Photo')}" loading="lazy" />
        ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
      </figure>`,
        )
        .join('')}
    </div>
  </section>`);
  }

  const body = `
${ABOUT_CSS}
  <header class="about-hero">
    ${avatarMark(s.avatarUrl, s.authorName, 'about-avatar')}
    <div>
      <h1>${esc(about.headline || s.authorName)}</h1>
      <div class="role">${esc(s.authorRole)}</div>
      ${
        about.socials.length
          ? `<div class="socials">
        ${about.socials
          .map(
            (l) =>
              `<a class="social-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`,
          )
          .join('')}
      </div>`
          : ''
      }
    </div>
  </header>

  ${
    sections.length === 0
      ? isAdmin
        ? `<div class="empty">
      <p>This page has not been filled in yet.</p>
      <p style="margin-top:1.25rem"><a class="btn" href="/admin/about">Add your story</a></p>
    </div>`
        : `<div class="empty">
      <p>More about ${esc(s.authorName)} is on the way.</p>
      <p style="margin-top:1.25rem"><a class="btn btn-ghost" href="/">Read the blog</a> <a class="btn btn-ghost" href="/projects">See the projects</a></p>
    </div>`
      : `${
          // Seeded sections alone are not the author speaking, so nudge them
          // to add the parts only they can write. Admin only.
          isAdmin && isAboutEmpty(about)
            ? `<div class="flash" style="margin-bottom:2rem">
        Skills and learning items are starter content.
        <a href="/admin/about" style="color:var(--accent)">Add your intro and journey →</a>
      </div>`
            : ''
        }${sections.join('')}`
  }
${GALLERY_JS}`;

  return layout({
    title: `About — ${s.authorName}`,
    description: `About ${s.authorName}${s.authorRole ? `, ${s.authorRole}` : ''}.`,
    body,
    path: '/about',
  });
}
