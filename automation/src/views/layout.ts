/** Escape untrusted text before interpolating it into HTML. */
export function esc(value: unknown): string {
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
}

const SITE = 'Saidul Islam Rajib';

export function layout({
  title,
  description = 'Engineering notes on backend development, DevOps and cloud infrastructure.',
  body,
  nav = defaultNav(),
  variant = 'default',
}: LayoutOptions): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
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
  .nav { margin-left: auto; display: flex; align-items: center; gap: 1.1rem; font-size: 0.9rem; }
  .nav a { color: var(--ink-3); }
  .nav a:hover { color: var(--ink); }
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
      <a class="wordmark" href="/"><span class="mark">SR</span> ${SITE}</a>
      <nav class="nav">${nav}</nav>
    </div>
  </header>

  <main class="shell ${variant}">
${body}
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <span>© ${new Date().getFullYear()} ${SITE} · Deployed by Jenkins on AWS EC2</span>
      <span>
        <a href="/">Blog</a> ·
        <a href="/health">Health</a> ·
        <a href="https://portfolio-rajib.vercel.app/">Portfolio</a>
      </span>
    </div>
  </footer>
</body>
</html>`;
}

export function defaultNav(): string {
  return `<a href="/">Home</a><a href="/tags">Tags</a><a href="/admin" class="btn btn-sm">Dashboard</a>`;
}

export function adminNav(): string {
  return `<a href="/">View site</a><a href="/admin">Dashboard</a><a href="/admin/posts/new" class="btn btn-sm">Write</a><a href="/logout">Sign out</a>`;
}
