/**
 * Escape untrusted text before interpolating it into HTML.
 *
 * Deliberately narrow: passing an object here would stringify to
 * "[object Object]" and silently render nonsense.
 */
export function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface LayoutOptions {
  title: string;
  description?: string;
  body: string;
  /** Rendered in the header's right slot. */
  nav?: string;
  /** Wider reading measure is used for article pages. */
  variant?: 'default' | 'article' | 'admin';
  /** Site-relative path of this page, for canonical and og:url. */
  path?: string;
  /** Preview image. Relative paths are made absolute against siteUrl. */
  image?: string;
  ogType?: 'website' | 'article' | 'profile';
  /** Emitted as article:published_time. */
  publishedAt?: string;
  /** Extra <head> markup, e.g. JSON-LD. */
  head?: string;
  /** Keep this page out of search results. */
  noindex?: boolean;
}

import { initials } from '../settings/settings.model';
import { getSettings } from '../settings/settings.store';

/**
 * Uploaded avatar when one is set, initials otherwise.
 *
 * The header renders this at 30px and the About hero at 96px, so the full
 * upload is never the right thing to send. It is also above the fold on
 * every page, so it loads eagerly with high priority rather than lazily.
 */
export function avatarMark(
  avatarUrl: string,
  name: string,
  cls = 'mark',
): string {
  if (!avatarUrl) {
    return `<span class="${cls}">${esc(initials(name))}</span>`;
  }

  const src = avatarUrl.startsWith('/uploads/')
    ? `/img/${avatarUrl.slice('/uploads/'.length)}?w=200`
    : avatarUrl;

  return `<img class="${cls} avatar-img" src="${esc(src)}" alt="${esc(name)}"
    width="200" height="200" decoding="async" fetchpriority="high" />`;
}

/**
 * Pages are cheap to regenerate but must never be served stale after an
 * edit, so the browser revalidates every time and the existing ETag turns
 * that into a 304 with no body.
 */
export const HTML_CACHE_CONTROL = 'no-cache, must-revalidate';

export function layout({
  title,
  description,
  body,
  nav,
  variant = 'default',
  path = '/',
  image,
  ogType = 'website',
  publishedAt,
  head = '',
  noindex = false,
}: LayoutOptions): string {
  const s = getSettings();
  const navigation = nav ?? defaultNav(path);
  const base = (s.siteUrl || '').replace(/\/+$/, '');
  const absolute = (target: string): string =>
    /^https?:\/\//i.test(target)
      ? target
      : `${base}${target.startsWith('/') ? '' : '/'}${target}`;

  const canonical = absolute(path);

  // Fall back to the avatar so a shared link is never imageless. Crawlers
  // will not follow a relative path, so this must be absolute.
  const preview = image ?? (s.avatarUrl || '');
  const previewUrl = preview ? absolute(preview) : '';
  const previewType = /\.png(\?|$)/i.test(previewUrl)
    ? 'image/png'
    : /\.(jpe?g)(\?|$)/i.test(previewUrl)
      ? 'image/jpeg'
      : /\.webp(\?|$)/i.test(previewUrl)
        ? 'image/webp'
        : '';

  // The site description doubles as the default preview text, so a bio set
  // in Settings is what people see when a link is shared.
  const summary = description || s.authorBio || s.siteTagline;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(summary)}" />
<link rel="canonical" href="${esc(canonical)}" />
${noindex ? '<meta name="robots" content="noindex, nofollow" />' : '<meta name="robots" content="index, follow" />'}

<!-- Open Graph: Facebook, LinkedIn, WhatsApp, Slack -->
<meta property="og:site_name" content="${esc(s.authorName)}" />
<meta property="og:type" content="${esc(ogType)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(summary)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:locale" content="en_US" />
${
  previewUrl
    ? [
        `<meta property="og:image" content="${esc(previewUrl)}" />`,
        // Facebook and LinkedIn size the card from these; without
        // them the preview is often dropped or rendered small.
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        previewType
          ? `<meta property="og:image:type" content="${previewType}" />`
          : '',
        previewUrl.startsWith('https://')
          ? `<meta property="og:image:secure_url" content="${esc(previewUrl)}" />`
          : '',
        `<meta property="og:image:alt" content="${esc(title)}" />`,
      ]
        .filter(Boolean)
        .join('\n')
    : ''
}
${
  publishedAt
    ? `<meta property="article:published_time" content="${esc(publishedAt)}" />
<meta property="article:author" content="${esc(s.authorName)}" />`
    : ''
}

<!-- Twitter / X -->
<meta name="twitter:card" content="${previewUrl ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(summary)}" />
${previewUrl ? `<meta name="twitter:image" content="${esc(previewUrl)}" />` : ''}
${head}
<style>
  :root {
    --bg: #ffffff;
    --surface: #ffffff;
    --surface-2: #f7f8f8;
    --border: #e6e6e6;
    --ink: #161616;
    --ink-2: #4a4a4a;
    --ink-3: #757575;
    --accent: #0f766e;
    --accent-ink: #ffffff;
    --danger: #b42318;
    --good: #067647;
    --warn: #b54708;
    --serif: "Iowan Old Style", "Palatino Linotype", "Source Serif Pro", Georgia, serif;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif;
    --mono: ui-monospace, SFMono-Regular, "Cascadia Code", Menlo, monospace;
    --measure: 680px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1115;
      --surface: #161920;
      --surface-2: #1c2029;
      --border: #2a2f3a;
      --ink: #f2f4f7;
      --ink-2: #c3c8d2;
      --ink-3: #8a92a3;
      --accent: #2dd4bf;
      --accent-ink: #06251f;
      --danger: #f97066;
      --good: #4ade80;
      --warn: #fdb022;
    }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    background: var(--bg);
    color: var(--ink-2);
    font-family: var(--sans);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; }

  /* ---------- header ---------- */
  .site-header {
    position: sticky; top: 0; z-index: 20;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: saturate(180%) blur(12px);
    border-bottom: 1px solid var(--border);
  }
  .header-inner {
    max-width: 1100px; margin: 0 auto;
    padding: 0.85rem 1.25rem;
    display: flex; align-items: center; gap: 1rem;
  }
  .wordmark {
    display: flex; align-items: center; gap: 0.6rem;
    font-weight: 700; color: var(--ink); letter-spacing: -0.02em;
    font-size: 1.02rem; white-space: nowrap;
  }
  .mark {
    width: 30px; height: 30px; border-radius: 50%;
    background: var(--accent); color: var(--accent-ink);
    display: grid; place-items: center;
    font-size: 0.8rem; font-weight: 800; flex-shrink: 0;
  }
  .avatar-img { object-fit: cover; padding: 0; }
  /* ---------- navigation ---------- */
  .nav { margin-left: auto; display: flex; align-items: center; gap: 1.1rem; font-size: 0.9rem; }
  .nav a { color: var(--ink-3); position: relative; padding: 0.15rem 0; white-space: nowrap; }
  .nav a:hover { color: var(--ink); }
  .nav a.active:not(.btn) { color: var(--ink); font-weight: 600; }
  .nav a.active:not(.btn)::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: -3px;
    height: 2px; background: var(--accent); border-radius: 2px;
  }
  .nav-head, .nav-overlay { display: none; }

  /*
   * A hidden checkbox drives the drawer, so it opens with scripting
   * disabled. Script only closes it on tap, Escape or outside click.
   */
  .nav-toggle { position: absolute; opacity: 0; pointer-events: none; }
  .nav-burger {
    display: none; cursor: pointer;
    width: 42px; height: 42px; border-radius: 10px; margin-right: 0.15rem;
    align-items: center; justify-content: center; flex-direction: column; gap: 4px;
  }
  .nav-burger:hover { background: var(--surface-2); }
  .nav-burger span {
    display: block; width: 18px; height: 2px; border-radius: 2px;
    background: var(--ink); transition: transform .2s, opacity .2s;
  }
  .nav-toggle:focus-visible + .nav-burger {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }

  /* Tablet: tighten before collapsing. */
  @media (max-width: 1040px) {
    .nav { gap: 0.85rem; font-size: 0.86rem; }
  }

  @media (max-width: 860px) {
    /*
     * backdrop-filter makes the header a containing block for fixed-position
     * descendants, which pinned the drawer to the header's height and clipped
     * every link. Dropping it restores the viewport as the containing block.
     */
    .site-header { backdrop-filter: none; background: var(--bg); }

    /* Burger sits first, so it lands on the left of the header. */
    .nav-burger { display: flex; order: -1; }
    .wordmark { font-size: 0.98rem; }

    .nav-overlay {
      display: block; position: fixed; inset: 0; z-index: 40;
      background: rgba(0, 0, 0, 0.45);
      opacity: 0; visibility: hidden; transition: opacity .22s;
    }
    .nav-toggle:checked ~ .nav-overlay { opacity: 1; visibility: visible; }

    .nav {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
      width: 82%; max-width: 320px;
      margin: 0; gap: 0; font-size: 1rem;
      flex-direction: column; align-items: stretch;
      background: var(--bg); border-right: 1px solid var(--border);
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.18);
      transform: translateX(-100%);
      transition: transform .24s ease;
      overflow-y: auto;
    }
    .nav-toggle:checked ~ .nav { transform: translateX(0); }

    .nav-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.1rem; background: var(--accent); color: var(--accent-ink);
      font-weight: 700; font-size: 0.95rem; flex-shrink: 0;
    }
    .nav-close {
      cursor: pointer; font-size: 1.5rem; line-height: 1;
      color: var(--accent-ink); padding: 0 0.2rem;
    }

    .nav a {
      padding: 0.95rem 1.1rem; color: var(--ink-2);
      border-bottom: 1px solid var(--border);
    }
    .nav a:hover { background: var(--surface-2); color: var(--ink); }
    /* A full-width row needs a bar, not an underline, to read as current. */
    .nav a.active:not(.btn)::after { display: none; }
    .nav a.active:not(.btn) {
      color: var(--accent); background: var(--surface-2);
      box-shadow: inset 3px 0 0 var(--accent);
    }
  }

  /* Freeze the page behind an open drawer. */
  @media (max-width: 860px) {
    html:has(.nav-toggle:checked) { overflow: hidden; }
  }

  .btn {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.45rem 0.9rem; border-radius: 100px;
    background: var(--accent); color: var(--accent-ink) !important;
    font-weight: 600; font-size: 0.86rem; border: 0; cursor: pointer;
    font-family: inherit;
  }
  .btn:hover { opacity: 0.9; }
  .btn-ghost {
    background: transparent; color: var(--ink-2) !important;
    border: 1px solid var(--border);
  }
  .btn-danger { background: var(--danger); color: #fff !important; }
  .btn-sm { padding: 0.32rem 0.7rem; font-size: 0.8rem; }

  /* ---------- shell ---------- */
  .shell { max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.25rem 5rem; }
  .shell.article { max-width: var(--measure); }
  .shell.admin { max-width: 1100px; }

  /* ---------- typography ---------- */
  h1, h2, h3, h4 { color: var(--ink); letter-spacing: -0.022em; line-height: 1.25; }
  .page-title { font-size: 2rem; margin-bottom: 0.4rem; }
  .page-sub { color: var(--ink-3); margin-bottom: 2rem; }
  .section-label {
    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-3); font-weight: 700;
    padding-bottom: 0.65rem; margin-bottom: 1.1rem;
    border-bottom: 1px solid var(--border);
  }

  /* ---------- tags ---------- */
  .tag {
    display: inline-block;
    font-size: 0.76rem; padding: 0.25rem 0.7rem; border-radius: 100px;
    background: var(--surface-2); color: var(--ink-2);
    border: 1px solid var(--border);
  }
  .tag:hover { border-color: var(--accent); color: var(--ink); }
  .tag-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }

  /* ---------- forms ---------- */
  label { display: block; font-size: 0.82rem; font-weight: 600; color: var(--ink-2); margin-bottom: 0.4rem; }
  input[type="text"], input[type="password"], input[type="search"], textarea, select {
    width: 100%; padding: 0.65rem 0.8rem;
    background: var(--surface); color: var(--ink);
    border: 1px solid var(--border); border-radius: 8px;
    font-size: 0.94rem; font-family: inherit;
  }
  textarea { resize: vertical; line-height: 1.6; }
  textarea.mono { font-family: var(--mono); font-size: 0.88rem; }
  input:focus, textarea:focus, select:focus {
    outline: none; border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .field { margin-bottom: 1.1rem; }
  .hint { font-size: 0.78rem; color: var(--ink-3); margin-top: 0.35rem; }

  /* ---------- flash ---------- */
  .flash {
    padding: 0.7rem 0.95rem; border-radius: 8px; margin-bottom: 1.5rem;
    font-size: 0.89rem; border: 1px solid var(--border); background: var(--surface-2);
  }
  .flash.ok { border-color: color-mix(in srgb, var(--good) 45%, var(--border)); color: var(--good); }
  .flash.err { border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); color: var(--danger); }

  .empty {
    text-align: center; padding: 3.5rem 1rem;
    color: var(--ink-3); border: 1px dashed var(--border); border-radius: 12px;
  }

  footer.site-footer {
    border-top: 1px solid var(--border);
    padding: 2rem 1.25rem 3rem; margin-top: 3rem;
    color: var(--ink-3); font-size: 0.85rem;
  }
  .footer-inner {
    max-width: 1100px; margin: 0 auto;
    display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }
  .footer-inner a { color: var(--accent); }
  .footer-inner a:hover { text-decoration: underline; }

  @media (max-width: 640px) {
    .page-title { font-size: 1.6rem; }
    .nav { gap: 0.75rem; font-size: 0.85rem; }
    .shell { padding: 1.75rem 1rem 3.5rem; }
  }
</style>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Open menu" />
      <label for="nav-toggle" class="nav-burger" aria-hidden="true">
        <span></span><span></span><span></span>
      </label>
      <a class="wordmark" href="/">${avatarMark(s.avatarUrl, s.authorName)} ${esc(s.authorName)}</a>
      <label for="nav-toggle" class="nav-overlay" aria-hidden="true"></label>
      <nav class="nav" id="site-nav">
        <div class="nav-head">
          <span>Menu</span>
          <label for="nav-toggle" class="nav-close" aria-hidden="true">&times;</label>
        </div>
        ${navigation}
      </nav>
    </div>
  </header>

  <main class="shell ${variant}">
${body}
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <span>
        © ${new Date().getFullYear()}.
        ${
          s.footerOwner
            ? s.footerOwnerUrl
              ? `<a href="${esc(s.footerOwnerUrl)}" target="_blank" rel="noopener noreferrer">${esc(s.footerOwner)}</a>.`
              : `${esc(s.footerOwner)}.`
            : ''
        }
        ${esc(s.footerSuffix)}
      </span>
      <span>
        ${s.footerLinks
          .map((link) =>
            link.url.startsWith('/')
              ? `<a href="${esc(link.url)}">${esc(link.label)}</a>`
              : `<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a>`,
          )
          .join(' · ')}
      </span>
    </div>
  </footer>
<script>
(function () {
  var toggle = document.getElementById('nav-toggle');
  if (!toggle) return;

  document.getElementById('site-nav').addEventListener('click', function (ev) {
    if (ev.target.tagName === 'A') toggle.checked = false;
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') toggle.checked = false;
  });

  document.addEventListener('click', function (ev) {
    // The overlay is inside the header, so an outside click means the page.
    if (!ev.target.closest('.site-header')) toggle.checked = false;
  });

  // Scroll lock for browsers without :has() support.
  function syncLock() {
    document.documentElement.style.overflow =
      toggle.checked && window.matchMedia('(max-width: 860px)').matches
        ? 'hidden'
        : '';
  }

  toggle.addEventListener('change', syncLock);
  window.addEventListener('resize', syncLock);
  syncLock();
})();
</script>
</body>
</html>`;
}

/**
 * Marks the current section. Longest matching prefix wins, so /projects/x
 * highlights Projects rather than Home.
 */
function navLink(
  href: string,
  label: string,
  path: string,
  /** Where the link goes, when that differs from the section it matches. */
  target = href,
): string {
  const active =
    href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);

  return `<a href="${target}" class="${active ? 'active' : ''}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
}

export function defaultNav(path = '/'): string {
  return [
    navLink('/', 'Home', path),
    navLink('/projects', 'Projects', path),
    navLink('/about', 'About', path),
    navLink('/tags', 'Tags', path),
    navLink('/admin', 'Dashboard', path),
  ].join('');
}

export function adminNav(path = '/admin'): string {
  return [
    '<a href="/">View site</a>',
    // Exact match: /admin is a prefix of every other admin route.
    `<a href="/admin" class="${path === '/admin' ? 'active' : ''}">Dashboard</a>`,
    navLink('/admin/projects', 'Projects', path),
    navLink('/admin/about', 'About', path),
    navLink('/admin/settings', 'Settings', path),
    navLink('/admin/posts', 'Write', path, '/admin/posts/new'),
    '<a href="/logout">Sign out</a>',
  ].join('');
}
