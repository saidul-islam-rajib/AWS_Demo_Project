import {
  AboutContent,
  GalleryItem,
  Milestone,
  STATUS_LABELS,
  captionPreview,
  isAboutEmpty,
  isCaptionLong,
  milestonePeriod,
} from '../about/about.model';
import { getSettings } from '../settings/settings.store';
import { avatarMark, esc, IMAGE_SKELETON, layout } from './layout';

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
  .about-hero .role { color: var(--ink-3); font-size: 1rem; text-align: left; }
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

  /*
   * Every prose block on this page is justified, on all screen sizes.
   * Hyphenation is not optional here: justified text without it stretches
   * word spacing to fill each line, which opens rivers of whitespace —
   * worst on narrow screens, which is exactly where it must still hold up.
   */
  .about-intro,
  .milestone-body,
  .learn-card p,
  .gallery figcaption,
  .about-hero .role {
    text-align: justify;
    hyphens: auto;
    -webkit-hyphens: auto;
    text-wrap: pretty;
  }

  .about-intro {
    font-family: var(--serif); font-size: 1.12rem; line-height: 1.78;
    color: var(--ink-2);
  }
  .about-intro p { margin: 0; }
  .about-intro h2 { font-size: 1.4rem; margin-top: 1.75rem; text-align: left; }
  .milestone-body h2, .milestone-body h3, .learn-card h3 { text-align: left; }
  .milestone-body ul, .milestone-body ol { text-align: left; }
  .milestone-body pre, .milestone-body code { text-align: left; }
  .about-intro h3 { font-size: 1.15rem; margin-top: 1.4rem; text-align: left; }
  .about-intro ul, .about-intro ol { padding-left: 1.4rem; text-align: left; }
  .about-intro li + li { margin-top: 0.35rem; }
  .about-intro blockquote {
    border-left: 3px solid var(--accent); padding-left: 1rem;
    color: var(--ink-3); text-align: left;
  }
  .about-intro pre {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 8px; padding: 0.9rem 1rem; overflow-x: auto; text-align: left;
  }
  .about-intro img { max-width: 100%; border-radius: 10px; }

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
  .milestone-body { font-size: 0.94rem; line-height: 1.68; color: var(--ink-2); }
  .milestone-body > * + * { margin-top: 0.6rem; }
  .milestone-body ul, .milestone-body ol { padding-left: 1.25rem; }
  .milestone-body li + li { margin-top: 0.25rem; }
  .milestone-body a { color: var(--accent); text-decoration: underline; }
  .milestone-body strong { color: var(--ink); }
  .milestone-body mark {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    color: inherit; padding: 0.05em 0.25em; border-radius: 3px;
  }
  .milestone-body code {
    font-family: var(--mono); font-size: 0.86em; background: var(--surface-2);
    border: 1px solid var(--border); padding: 0.1em 0.35em; border-radius: 4px;
  }

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
  .gallery { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
  .gallery figure { margin: 0; }
  .shot-frame { position: relative; }
  .gallery img {
    width: 100%; aspect-ratio: 4 / 3; object-fit: cover;
    border-radius: 10px; border: 1px solid var(--border);
    cursor: zoom-in; display: block;
    /*
     * No background here: the skeleton supplies one, and this selector is
     * the more specific of the two, so a tint set here would win and the
     * shimmer would never be seen.
     */
  }
  /*
   * The display rule above outranks the hidden attribute, which is only
   * display none in the user agent sheet. Without this, every image in a
   * record renders stacked instead of one at a time.
   */
  .gallery img[hidden],
  .shot-nav[hidden] { display: none; }

  .shot-nav {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 30px; height: 30px; border-radius: 50%;
    border: 0; cursor: pointer; z-index: 2;
    background: rgba(0,0,0,.55); color: #fff;
    font-size: 1.2rem; line-height: 1; font-family: inherit;
    display: grid; place-items: center;
    opacity: 0; transition: opacity .18s;
  }
  .shot-frame:hover .shot-nav, .shot-nav:focus-visible { opacity: 1; }
  .shot-nav.prev { left: 0.4rem; }
  .shot-nav.next { right: 0.4rem; }
  .shot-nav:hover { background: rgba(0,0,0,.75); }
  /* Touch has no hover, so the controls stay visible there. */
  @media (hover: none) { .shot-nav { opacity: 1; } }

  .shot-count {
    position: absolute; top: 0.45rem; right: 0.45rem; z-index: 2;
    background: rgba(0,0,0,.6); color: #fff;
    font-size: 0.68rem; padding: 0.1rem 0.4rem; border-radius: 100px;
    font-variant-numeric: tabular-nums;
  }
  .shot-dots {
    position: absolute; bottom: 0.45rem; left: 0; right: 0; z-index: 2;
    display: flex; justify-content: center; gap: 0.25rem;
  }
  .shot-dots .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: rgba(255,255,255,.55); cursor: pointer;
  }
  .shot-dots .dot.on { background: #fff; width: 14px; border-radius: 100px; }

  .gallery figcaption .see-more {
    background: none; border: 0; padding: 0; margin-left: 0.3rem;
    color: var(--accent); cursor: pointer; font-family: inherit;
    font-size: 0.78rem; font-weight: 600; text-align: left;
  }
  .gallery figcaption .see-more:hover { text-decoration: underline; }

  /* ---------- caption modal ---------- */
  .shot-modal {
    position: fixed; inset: 0; z-index: 120;
    background: rgba(0,0,0,.88);
    display: flex; align-items: center; justify-content: center; padding: 1.5rem;
  }
  .shot-modal[hidden] { display: none; }
  /*
   * The panel itself does not scroll. It used to, which meant a long caption
   * dragged the photo up out of view as you read — you had to scroll back to
   * see what the words were about. Now the photo holds its place and only the
   * caption moves.
   */
  .shot-modal-inner {
    max-width: 760px; width: 100%; max-height: 100%;
    display: flex; flex-direction: column; gap: 1rem; overflow: hidden;
  }
  /* flex: none, or a tall photo would squeeze the caption to nothing. */
  .shot-modal-media { position: relative; flex: none; }
  .shot-modal-media img {
    width: 100%; max-height: 65vh; object-fit: contain;
    border-radius: 10px; display: block; cursor: default;
  }
  /*
   * The modal image takes its height from the picture, so before one arrives
   * it collapses to nothing and the skeleton has no area to show in. Hold a
   * viewport-relative height until it loads, then let the image decide.
   */
  .shot-modal-media img.skel:not(.is-loaded) { min-height: 45vh; }
  .shot-modal-media .shot-nav { opacity: 1; width: 38px; height: 38px; font-size: 1.5rem; }
  .shot-modal-caption {
    color: #f2f4f7; font-family: var(--serif); font-size: 1.02rem;
    line-height: 1.7; text-align: justify; hyphens: auto;
    /*
     * Takes the height left over after the photo and scrolls inside it.
     * min-height: 0 is what makes that work — a flex item defaults to
     * min-height: auto, which refuses to shrink below its content and would
     * push the overflow back out onto the panel.
     */
    flex: 1 1 auto; min-height: 0; overflow-y: auto;
    padding-right: 0.9rem;
    /* Firefox; the WebKit equivalent is below. */
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.35) transparent;
  }
  .shot-modal-caption::-webkit-scrollbar { width: 8px; }
  .shot-modal-caption::-webkit-scrollbar-track { background: transparent; }
  .shot-modal-caption::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.3); border-radius: 100px;
  }
  .shot-modal-caption::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.5); }
  .shot-modal-close {
    position: absolute; top: 1rem; right: 1.25rem;
    background: transparent; border: 0; color: #fff;
    font-size: 2rem; line-height: 1; cursor: pointer; opacity: .8;
    font-family: inherit; z-index: 2;
  }
  .shot-modal-close:hover { opacity: 1; }
  .gallery figcaption {
    font-size: 0.78rem; color: var(--ink-3); margin-top: 0.4rem; line-height: 1.5;
    /* Narrowest measure on the page, so hyphenation does the most work here. */
    hyphens: auto; -webkit-hyphens: auto;
  }

  @media (max-width: 600px) {
    .about-avatar { width: 64px; height: 64px; font-size: 1.35rem; }
    .about-hero { gap: 0.9rem; padding-bottom: 1.5rem; margin-bottom: 1.75rem; }
    .about-hero h1 { font-size: 1.6rem; }
    .about-section { margin-bottom: 2.25rem; }
    .about-intro { font-size: 1.02rem; line-height: 1.7; }
    .timeline { padding-left: 1.3rem; }
    .milestone:before { left: -1.3rem; }
    .gallery { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
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
  var dataTag = document.getElementById('gallery-data');
  if (!dataTag) return;

  var records = [];
  try { records = JSON.parse(dataTag.textContent) || []; } catch (e) { return; }

  // ---------- inline slider ----------
  function shotOf(figure) {
    return figure.querySelectorAll('.shot-track img');
  }

  function reveal(img) {
    if (!img.dataset.src) return;
    img.src = img.dataset.src;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    delete img.dataset.src;
    delete img.dataset.srcset;
  }

  function showAt(figure, index) {
    var imgs = shotOf(figure);
    if (!imgs.length) return;

    var next = (index + imgs.length) % imgs.length;
    imgs.forEach(function (img, i) { img.hidden = i !== next; });
    reveal(imgs[next]);

    // Warm the neighbour so the next tap is instant.
    reveal(imgs[(next + 1) % imgs.length]);

    var at = figure.querySelector('.shot-count .at');
    if (at) at.textContent = String(next + 1);

    figure.querySelectorAll('.shot-dots .dot').forEach(function (dot, i) {
      dot.classList.toggle('on', i === next);
    });

    figure.dataset.at = String(next);
  }

  function currentIndex(figure) {
    return parseInt(figure.dataset.at || '0', 10);
  }

  document.addEventListener('click', function (ev) {
    var figure = ev.target.closest('.gallery .shot');
    if (!figure) return;

    if (ev.target.closest('.shot-nav.next')) {
      showAt(figure, currentIndex(figure) + 1);
      return;
    }
    if (ev.target.closest('.shot-nav.prev')) {
      showAt(figure, currentIndex(figure) - 1);
      return;
    }
    var dot = ev.target.closest('.shot-dots .dot');
    if (dot) {
      showAt(figure, parseInt(dot.getAttribute('data-to'), 10));
      return;
    }

    // The image and "See more" both open the same modal, so a reader never
    // has to guess which control shows the rest of the caption.
    if (ev.target.closest('.see-more') || ev.target.tagName === 'IMG') {
      openModal(
        parseInt(figure.getAttribute('data-index'), 10),
        currentIndex(figure)
      );
    }
  });

  // ---------- modal ----------
  var modal = document.getElementById('shot-modal');
  var modalImg = document.getElementById('shot-modal-img');
  var modalCap = document.getElementById('shot-modal-caption');
  var record = 0;
  var slide = 0;

  function paint() {
    var item = records[record];
    if (!item) return;

    var urls = item.urls || [];
    slide = (slide + urls.length) % Math.max(urls.length, 1);
    // A wide variant: sharp enough for the modal, far smaller than a
    // multi-megapixel original.
    var full = urls[slide] || '';
    // Paging to another photo starts a fresh download, so the skeleton has to
    // go back to loading; otherwise the second image inherits the first one's
    // finished state and the wait looks like a frozen picture.
    modalImg.classList.remove('is-loaded');
    modalImg.classList.remove('is-error');
    modalImg.src = full.indexOf('/uploads/') === 0
      ? '/img/' + full.slice('/uploads/'.length) + '?w=1600'
      : full;
    modalImg.alt = item.caption || 'Photo';
    modalCap.textContent = item.caption || '';

    var multiple = urls.length > 1;
    document.getElementById('modal-prev').hidden = !multiple;
    document.getElementById('modal-next').hidden = !multiple;
  }

  function openModal(recordIndex, slideIndex) {
    record = recordIndex;
    slide = slideIndex || 0;
    paint();
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    document.documentElement.style.overflow = '';
  }

  document.getElementById('modal-next').addEventListener('click', function (ev) {
    ev.stopPropagation();
    slide++;
    paint();
  });
  document.getElementById('modal-prev').addEventListener('click', function (ev) {
    ev.stopPropagation();
    slide--;
    paint();
  });
  document.querySelector('.shot-modal-close').addEventListener('click', closeModal);

  modal.addEventListener('click', function (ev) {
    // Only a click on the backdrop closes it, not one on the content.
    if (!ev.target.closest('.shot-modal-inner')) closeModal();
  });

  document.addEventListener('keydown', function (ev) {
    if (modal.hidden) return;
    if (ev.key === 'Escape') closeModal();
    if (ev.key === 'ArrowRight') { slide++; paint(); }
    if (ev.key === 'ArrowLeft') { slide--; paint(); }
  });
})();
</script>`;

/**
 * Uploads are served resized from /img; anything else (an external URL) is
 * passed through untouched.
 */
function sized(url: string, width: number): string {
  if (!url.startsWith('/uploads/')) return url;
  return `/img/${url.slice('/uploads/'.length)}?w=${width}`;
}

export function aboutPage(
  about: AboutContent,
  introHtml: string,
  isAdmin = false,
  /** Milestone descriptions, pre-rendered from markdown, in the same order. */
  milestoneHtml: string[] = [],
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
    const renderMilestone = (m: Milestone, index: number): string => {
      const label = milestonePeriod(m);
      const body = milestoneHtml[index] ?? '';

      return `<div class="milestone">
        ${label ? `<div class="period">${esc(label)}</div>` : ''}
        <h3>${esc(m.title)}</h3>
        ${m.org ? `<div class="org">${esc(m.org)}</div>` : ''}
        ${body ? `<div class="milestone-body">${body}</div>` : ''}
      </div>`;
    };

    sections.push(`
  <section class="about-section">
    <h2>Journey</h2>
    <div class="timeline">
      ${about.milestones.map(renderMilestone).join('')}
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
    const record = (item: GalleryItem, index: number): string => {
      const many = item.urls.length > 1;
      const long = isCaptionLong(item.caption);

      return `<figure class="shot" data-index="${index}">
        <div class="shot-frame">
          <div class="shot-track">
            ${item.urls
              .map((url, i) =>
                i === 0
                  ? `<img class="skel"
                    src="${esc(sized(url, 400))}"
                    srcset="${esc(sized(url, 400))} 400w, ${esc(sized(url, 800))} 800w"
                    sizes="(max-width: 600px) 45vw, 220px"
                    width="400" height="300"
                    alt="${esc(item.caption || 'Photo')}"
                    loading="lazy" decoding="async" />`
                  : // Held back until the reader actually pages to it, so a
                    // record with six images still costs one request.
                    `<img class="skel"
                    data-src="${esc(sized(url, 400))}"
                    data-srcset="${esc(sized(url, 400))} 400w, ${esc(sized(url, 800))} 800w"
                    sizes="(max-width: 600px) 45vw, 220px"
                    width="400" height="300"
                    alt="${esc(item.caption || 'Photo')}"
                    loading="lazy" decoding="async" hidden />`,
              )
              .join('')}
          </div>
          ${
            many
              ? `<button type="button" class="shot-nav prev" aria-label="Previous image">‹</button>
          <button type="button" class="shot-nav next" aria-label="Next image">›</button>
          <span class="shot-count"><span class="at">1</span>/${item.urls.length}</span>
          <div class="shot-dots">${item.urls
            .map(
              (_, i) =>
                `<span class="dot${i === 0 ? ' on' : ''}" data-to="${i}"></span>`,
            )
            .join('')}</div>`
              : ''
          }
        </div>
        ${
          item.caption
            ? `<figcaption>
          <span class="cap-text">${esc(long ? captionPreview(item.caption) : item.caption)}</span>
          ${long ? '<button type="button" class="see-more">See more</button>' : ''}
        </figcaption>`
            : ''
        }
      </figure>`;
    };

    sections.push(`
  <section class="about-section">
    <h2>Photos</h2>
    <div class="gallery">
      ${about.gallery.map(record).join('')}
    </div>
  </section>

  <div class="shot-modal" id="shot-modal" hidden>
    <button type="button" class="shot-modal-close" aria-label="Close">&times;</button>
    <div class="shot-modal-inner" role="dialog" aria-modal="true" aria-label="Photo">
      <div class="shot-modal-media">
        <img id="shot-modal-img" class="skel" src="" alt="" />
        <button type="button" class="shot-nav prev" id="modal-prev" aria-label="Previous image">‹</button>
        <button type="button" class="shot-nav next" id="modal-next" aria-label="Next image">›</button>
      </div>
      <p class="shot-modal-caption" id="shot-modal-caption"></p>
    </div>
  </div>

  <script id="gallery-data" type="application/json">${JSON.stringify(
    about.gallery,
  ).replace(/</g, '\u003c')}</script>`);
  }

  const body = `
${ABOUT_CSS}
${IMAGE_SKELETON}
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
