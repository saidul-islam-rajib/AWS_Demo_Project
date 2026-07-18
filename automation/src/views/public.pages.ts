import {
  Post,
  excerpt,
  formatDate,
  highlightList,
  readingMinutes,
  relativeDate,
  wordCount,
} from '../posts/post.model';
import { avatarMark, esc, layout } from './layout';
import { getSettings } from '../settings/settings.store';

const FEED_CSS = `
<style>
  .hero {
    padding: 2.25rem 0 2.5rem; margin-bottom: 2.5rem;
    border-bottom: 1px solid var(--border);
  }
  .hero-byline {
    display: flex; align-items: center; gap: 0.6rem;
    margin-bottom: 1.1rem;
  }
  .hero-byline .who { font-size: 0.88rem; font-weight: 600; color: var(--ink); }
  .hero-byline .role { font-size: 0.82rem; color: var(--ink-3); }
  .hero h1 {
    font-family: var(--serif); font-size: clamp(2.1rem, 5.5vw, 3.1rem);
    line-height: 1.08; margin-bottom: 0.9rem; letter-spacing: -0.03em;
  }
  .hero p { font-size: 1.06rem; line-height: 1.62; color: var(--ink-2); }
  .search-wrap { position: relative; max-width: 520px; margin: 1.9rem 0 0; }
  .searchbar { display: flex; gap: 0.5rem; }
  .search-field { position: relative; flex: 1; }
  .search-field svg {
    position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%);
    width: 16px; height: 16px; color: var(--ink-3); pointer-events: none;
  }
  .searchbar input {
    border-radius: 100px; padding: 0.7rem 2.6rem 0.7rem 2.4rem;
    background: var(--surface-2);
  }
  .searchbar input:focus { background: var(--surface); }
  .searchbar .btn { flex-shrink: 0; }
  .search-clear {
    position: absolute; right: 0.7rem; top: 50%; transform: translateY(-50%);
    background: transparent; border: 0; cursor: pointer; color: var(--ink-3);
    font-size: 1.1rem; line-height: 1; padding: 0.2rem; display: none;
    font-family: inherit;
  }
  .search-clear:hover { color: var(--ink); }

  /* ---------- live results ---------- */
  .search-results {
    position: absolute; top: calc(100% + 0.5rem); left: 0; right: 0; z-index: 30;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.14);
    overflow: hidden; display: none;
  }
  .search-results.open { display: block; }
  .search-result {
    display: flex; align-items: baseline; gap: 0.6rem;
    padding: 0.65rem 0.9rem; border-bottom: 1px solid var(--border);
    cursor: pointer;
  }
  .search-result:last-child { border-bottom: 0; }
  .search-result:hover, .search-result.highlighted { background: var(--surface-2); }
  .search-result .r-title { color: var(--ink); font-weight: 600; font-size: 0.92rem; }
  .search-result .r-meta { font-size: 0.76rem; color: var(--ink-3); margin-left: auto; white-space: nowrap; }
  .search-result .r-kind {
    font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em;
    font-weight: 700; color: var(--accent);
    border: 1px solid currentColor; border-radius: 100px; padding: 0.05rem 0.4rem;
  }
  .search-empty { padding: 0.9rem; font-size: 0.86rem; color: var(--ink-3); text-align: center; }

  .feed-layout { display: grid; grid-template-columns: 1fr 260px; gap: 3rem; align-items: start; }
  @media (max-width: 900px) {
    .feed-layout { grid-template-columns: 1fr; gap: 2rem; }
    /* Sticky in a single column would pin the sidebar over the posts. */
    .feed-side { position: static; }
  }
  @media (max-width: 600px) {
    .hero { padding: 1.5rem 0 1.75rem; margin-bottom: 1.75rem; }
    .hero h1 { font-size: 1.75rem; }
    .hero p { font-size: 0.98rem; }
    .search-wrap { max-width: none; }
    .searchbar { flex-direction: column; }
    .searchbar .btn { width: 100%; justify-content: center; }
    .card h2 { font-size: 1.22rem; }
    .stat-row { grid-template-columns: 1fr 1fr; }
  }

  .card {
    display: block; padding: 1.6rem 0;
    border-bottom: 1px solid var(--border);
  }
  .card:last-child { border-bottom: 0; }
  .card-meta {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.8rem; color: var(--ink-3); margin-bottom: 0.6rem;
  }
  .card h2 {
    font-family: var(--serif); font-size: 1.4rem; line-height: 1.3;
    margin-bottom: 0.4rem;
  }
  .card:hover h2 { color: var(--accent); }
  .card .sub { color: var(--ink-3); font-size: 0.95rem; margin-bottom: 0.55rem; }
  .card .excerpt { font-size: 0.93rem; margin-bottom: 0.85rem; }
  .card-footer { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .highlight-chip {
    border-left: 3px solid var(--accent);
    padding: 0.35rem 0 0.35rem 0.75rem; margin: 0.75rem 0;
    font-family: var(--serif); font-size: 0.98rem;
    color: var(--ink-2); font-style: italic;
  }
  .key-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.75rem 0; }
  .key-chip {
    display: inline-block; font-size: 0.8rem; font-weight: 600;
    padding: 0.25rem 0.65rem; border-radius: 5px;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
  }
  .key-chips.article { margin: 1.75rem 0; gap: 0.5rem; }
  .key-chips.article .key-chip { font-size: 0.88rem; padding: 0.35rem 0.8rem; }

  .takeaways {
    border-left: 3px solid var(--accent);
    padding: 0.6rem 0 0.6rem 0.9rem; margin: 0.85rem 0;
  }
  .takeaways-label {
    display: block; font-size: 0.7rem; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--ink-3); font-weight: 700;
    margin-bottom: 0.4rem;
  }
  .takeaways ul { list-style: none; }
  .takeaways li {
    position: relative; padding-left: 1rem; font-size: 0.92rem;
    color: var(--ink-2); margin-bottom: 0.25rem;
  }
  .takeaways li:before {
    content: "▸"; position: absolute; left: 0; color: var(--accent);
  }
  .takeaways.article { margin: 2rem 0; padding: 1rem 0 1rem 1.1rem; }
  .takeaways.article li { font-family: var(--serif); font-size: 1.05rem; margin-bottom: 0.45rem; }
  .takeaways.article .takeaways-label { font-family: var(--sans); margin-bottom: 0.6rem; }

  .draft-pill {
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--warn); border: 1px solid currentColor;
    padding: 0.1rem 0.45rem; border-radius: 100px; font-weight: 700;
  }

  /*
   * The aside sticks as one unit. Making each .rail sticky pinned both to the
   * same offset, so "Browse tags" scrolled up underneath "At a glance".
   */
  .feed-side { position: sticky; top: 5rem; }
  .rail { display: block; }
  .rail h3 {
    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-3); margin-bottom: 0.9rem;
  }
  .rail + .rail { margin-top: 2.25rem; }
  .stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .stat {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 10px; padding: 0.75rem 0.85rem;
  }
  .stat .v { font-size: 1.3rem; font-weight: 700; color: var(--ink); line-height: 1.15; }
  .stat .l { font-size: 0.72rem; color: var(--ink-3); margin-top: 0.15rem; }
  .stat.wide { grid-column: 1 / -1; }
  .stat.wide .v { font-size: 1rem; }
  .stat .v a { color: var(--accent); }
</style>`;

/**
 * A keyword is short *and* only a word or two — length alone is not enough,
 * since a real takeaway like "Docker containers are ephemeral" is only 31
 * characters but is plainly a sentence.
 */
function isKeyword(text: string): boolean {
  return text.length <= 24 && text.split(/\s+/).length <= 2;
}

/**
 * Three shapes, picked from the content itself:
 * short entries become chips, one sentence becomes a pull quote,
 * several sentences become a takeaways list.
 */
function highlightBlock(post: Post, variant: 'card' | 'article'): string {
  const items = highlightList(post.highlight);
  if (items.length === 0) return '';

  if (items.every(isKeyword)) {
    return `<div class="key-chips ${variant}">
      ${items.map((i) => `<span class="key-chip">${esc(i)}</span>`).join('')}
    </div>`;
  }

  if (items.length === 1) {
    const cls = variant === 'article' ? 'pullquote' : 'highlight-chip';
    return `<p class="${cls}">${esc(items[0])}</p>`;
  }

  return `<div class="takeaways ${variant}">
    <span class="takeaways-label">Key takeaways</span>
    <ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
  </div>`;
}

function card(post: Post): string {
  const mins = readingMinutes(post.content);

  return `
  <article class="card">
    <a href="/post/${esc(post.slug)}">
      <div class="card-meta">
        <span>${esc(formatDate(post.publishedAt))}</span><span>·</span>
        <span>${mins} min read</span>
        ${post.views ? `<span>·</span><span>${post.views} views</span>` : ''}
        ${post.status === 'draft' ? '<span class="draft-pill">Draft</span>' : ''}
      </div>
      <h2>${esc(post.title)}</h2>
      ${post.subtitle ? `<p class="sub">${esc(post.subtitle)}</p>` : ''}
      ${highlightBlock(post, 'card')}
      <p class="excerpt">${esc(excerpt(post.content))}</p>
    </a>
    <div class="card-footer tag-row">
      ${post.tags.map((t) => `<a class="tag" href="/tag/${esc(t)}">${esc(t)}</a>`).join('')}
    </div>
  </article>`;
}

/**
 * Live search. Debounced so typing does not fire a request per keystroke,
 * with arrow-key navigation and Escape to dismiss. The form still submits
 * normally if the script fails, so search works without JavaScript.
 */
const SEARCH_JS = `
<script>
(function () {
  var input = document.getElementById('q');
  var panel = document.getElementById('search-results');
  var clear = document.getElementById('search-clear');
  if (!input || !panel) return;

  var timer = null;
  var items = [];
  var cursor = -1;
  var lastQuery = '';

  function hide() { panel.classList.remove('open'); cursor = -1; }

  function toggleClear() {
    clear.style.display = input.value ? 'block' : 'none';
  }

  function highlight(index) {
    var nodes = panel.querySelectorAll('.search-result');
    nodes.forEach(function (n) { n.classList.remove('highlighted'); });
    if (index >= 0 && nodes[index]) {
      nodes[index].classList.add('highlighted');
      nodes[index].scrollIntoView({ block: 'nearest' });
    }
  }

  function render(results) {
    if (!results.length) {
      panel.innerHTML = '<div class="search-empty">No matches</div>';
      panel.classList.add('open');
      return;
    }

    panel.innerHTML = results.map(function (r) {
      return '<a class="search-result" href="' + r.url + '" role="option">' +
        '<span class="r-kind">' + r.kind + '</span>' +
        '<span class="r-title"></span>' +
        '<span class="r-meta">' + r.meta + '</span>' +
        '</a>';
    }).join('');

    // Titles are set as text, never HTML, so post titles cannot inject markup.
    panel.querySelectorAll('.r-title').forEach(function (node, i) {
      node.textContent = results[i].title;
    });

    items = results;
    cursor = -1;
    panel.classList.add('open');
  }

  function run() {
    var q = input.value.trim();
    toggleClear();

    if (q.length < 2) { hide(); return; }
    if (q === lastQuery) { panel.classList.add('open'); return; }
    lastQuery = q;

    fetch('/api/search?q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (data) { render(data.results || []); })
      .catch(function () { hide(); });
  }

  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(run, 180);
  });

  input.addEventListener('focus', function () {
    if (items.length && input.value.trim().length >= 2) panel.classList.add('open');
  });

  input.addEventListener('keydown', function (ev) {
    var open = panel.classList.contains('open');

    if (ev.key === 'Escape') { hide(); input.blur(); return; }
    if (!open) return;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      cursor = Math.min(cursor + 1, items.length - 1);
      highlight(cursor);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      cursor = Math.max(cursor - 1, -1);
      highlight(cursor);
    } else if (ev.key === 'Enter' && cursor >= 0) {
      ev.preventDefault();
      window.location.href = items[cursor].url;
    }
  });

  clear.addEventListener('click', function () {
    input.value = '';
    lastQuery = '';
    hide();
    toggleClear();
    input.focus();
  });

  document.addEventListener('click', function (ev) {
    if (!ev.target.closest('.search-wrap')) hide();
  });

  // "/" focuses search, the way most documentation sites behave.
  document.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && document.activeElement !== input &&
        !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      ev.preventDefault();
      input.focus();
    }
  });

  toggleClear();
})();
</script>`;

export function homePage(opts: {
  posts: Post[];
  tags: { tag: string; count: number }[];
  stats: {
    published: number;
    tags: number;
    words: number;
    readingMinutes: number;
    latestDate?: string;
    topTag?: string;
  };
  query?: string;
  activeTag?: string;
}): string {
  const { posts, tags, stats, query = '', activeTag } = opts;

  const heading = activeTag
    ? `Tagged “${esc(activeTag)}”`
    : query
      ? `Results for “${esc(query)}”`
      : esc(getSettings().siteTitle);

  const blurb =
    activeTag || query
      ? `${posts.length} post${posts.length === 1 ? '' : 's'} found.`
      : esc(getSettings().siteTagline);

  // The intro block is hideable, but tag and search headings must always
  // render or the page loses its context entirely.
  const showIntro = getSettings().showIntro || Boolean(activeTag || query);

  const body = `
${FEED_CSS}
  ${showIntro ? `<section class="hero">` : `<section class="hero" style="padding-top:1rem;border-bottom:0;margin-bottom:1rem">`}
    ${
      activeTag || query || !showIntro
        ? ''
        : `<div class="hero-byline">
      ${avatarMark(getSettings().avatarUrl, getSettings().authorName)}
      <div>
        <div class="who">${esc(getSettings().authorName)}</div>
        <div class="role">${esc(getSettings().authorRole)}</div>
      </div>
    </div>`
    }
    ${showIntro ? `<h1>${heading}</h1>` : ''}
    ${showIntro ? `<p>${blurb}</p>` : ''}
    <div class="search-wrap">
      <form class="searchbar" action="/search" method="get" role="search" autocomplete="off">
        <div class="search-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" stroke-linecap="round" />
          </svg>
          <input type="search" id="q" name="q" placeholder="Search posts and tags…"
                 value="${esc(query)}" aria-label="Search posts"
                 aria-autocomplete="list" aria-controls="search-results" />
          <button type="button" class="search-clear" id="search-clear" aria-label="Clear search">&times;</button>
        </div>
        <button class="btn" type="submit">Search</button>
      </form>
      <div class="search-results" id="search-results" role="listbox" aria-label="Search results"></div>
    </div>
  </section>

  <div class="feed-layout">
    <div>
      ${
        posts.length
          ? posts.map(card).join('')
          : `<div class="empty"><p>No posts yet.</p></div>`
      }
    </div>

    <aside class="feed-side">
      <div class="rail">
        <h3>At a glance</h3>
        <div class="stat-row">
          <div class="stat"><div class="v">${stats.published}</div><div class="l">Posts published</div></div>
          <div class="stat"><div class="v">${stats.tags}</div><div class="l">Topics covered</div></div>
          ${
            stats.latestDate
              ? `<div class="stat wide"><div class="v">${esc(relativeDate(stats.latestDate))}</div><div class="l">Last published</div></div>`
              : ''
          }
          ${
            stats.topTag
              ? `<div class="stat wide"><div class="v"><a href="/tag/${esc(stats.topTag)}">${esc(stats.topTag)}</a></div><div class="l">Most written about</div></div>`
              : ''
          }
        </div>
      </div>

      <div class="rail">
        <h3>Browse tags</h3>
        <div class="tag-row">
          ${
            tags.length
              ? tags
                  .map(
                    ({ tag, count }) =>
                      `<a class="tag" href="/tag/${esc(tag)}">${esc(tag)} <span style="opacity:.6">${count}</span></a>`,
                  )
                  .join('')
              : '<span class="hint">No tags yet.</span>'
          }
        </div>
      </div>
    </aside>
  </div>`;

  return layout({
    title: activeTag
      ? `Posts tagged ${activeTag} — ${getSettings().authorName}`
      : `${getSettings().authorName} — ${getSettings().siteTitle}`,
    body: body + SEARCH_JS,
    path: activeTag ? `/tag/${activeTag}` : query ? '/search' : '/',
  });
}

/** First image in the body, used as the social preview. */
function firstImage(content: string): string | undefined {
  const match = /!\[[^\]]*\]\(([^)\s]+)/.exec(content);
  return match?.[1];
}

export function postPage(
  post: Post,
  related: Post[],
  renderedHtml: string,
): string {
  const mins = readingMinutes(post.content);
  const words = wordCount(post.content);

  const body = `
<style>
  .article-head { margin-bottom: 2.25rem; }
  .article-head h1 {
    font-family: var(--serif); font-size: clamp(1.9rem, 5vw, 2.6rem);
    line-height: 1.18; margin-bottom: 0.7rem;
  }
  .article-head .sub {
    font-size: 1.1rem; color: var(--ink-3); margin-bottom: 1.1rem;
    font-family: var(--serif);
  }
  .byline {
    display: flex; align-items: center; gap: 0.65rem;
    padding: 1rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
    font-size: 0.86rem; color: var(--ink-3);
  }
  .byline .who { font-weight: 600; color: var(--ink); }
  .pullquote {
    border-left: 3px solid var(--accent);
    padding: 0.6rem 0 0.6rem 1.1rem; margin: 2rem 0;
    font-family: var(--serif); font-size: 1.25rem; line-height: 1.45;
    color: var(--ink); font-style: italic;
  }
  .prose { font-family: var(--serif); font-size: 1.13rem; line-height: 1.75; color: var(--ink-2); }
  .prose > * + * { margin-top: 1.4rem; }
  .prose h2 { font-size: 1.5rem; margin-top: 2.4rem; }
  .prose h3 { font-size: 1.22rem; margin-top: 2rem; }
  .prose ul, .prose ol { padding-left: 1.4rem; }
  .prose li + li { margin-top: 0.4rem; }
  .prose a { color: var(--accent); text-decoration: underline; }
  .prose code {
    font-family: var(--mono); font-size: 0.86em;
    background: var(--surface-2); border: 1px solid var(--border);
    padding: 0.1em 0.38em; border-radius: 5px; color: var(--ink);
  }
  .prose pre {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 10px; padding: 1rem 1.1rem; overflow-x: auto;
    font-size: 0.92rem;
  }
  .prose pre code { background: none; border: 0; padding: 0; font-size: 0.88rem; }
  .prose blockquote {
    border-left: 3px solid var(--border); padding-left: 1.1rem; color: var(--ink-3);
  }
  .prose img {
    max-width: 100%; height: auto; border-radius: 10px;
    border: 1px solid var(--border); display: block; margin: 2rem auto;
    cursor: zoom-in;
  }
  /* Portrait shots would otherwise run the full column height. */
  .prose > p > img, .prose > img { max-height: 520px; width: auto; }

  /* ---------- column blocks ---------- */
  .md-columns {
    display: grid; gap: 1.25rem; margin: 2rem 0;
    grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
    align-items: start;
  }
  .md-columns[data-cols="3"] { --cols: 3; }
  .md-columns .md-col > *:first-child { margin-top: 0; }
  .md-columns .md-col > * + * { margin-top: 0.9rem; }
  .md-columns img {
    margin: 0; width: 100%; max-height: 340px; object-fit: cover;
  }
  .md-columns p { font-size: 1rem; line-height: 1.65; }
  @media (max-width: 640px) {
    .md-columns { grid-template-columns: 1fr; gap: 1rem; }
    .md-columns img { max-height: 260px; }
  }

  /* ---------- lightbox ---------- */
  .lightbox {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0, 0, 0, 0.9);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem; cursor: zoom-out;
  }
  .lightbox img {
    max-width: 100%; max-height: 100%;
    border-radius: 6px; border: 0; margin: 0; cursor: default;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .lightbox-close {
    position: absolute; top: 1rem; right: 1.25rem;
    background: transparent; border: 0; color: #fff;
    font-size: 2rem; line-height: 1; cursor: pointer; opacity: 0.8;
    font-family: inherit;
  }
  .lightbox-close:hover { opacity: 1; }
  .lightbox-hint {
    position: absolute; bottom: 1.25rem; left: 0; right: 0;
    text-align: center; color: rgba(255, 255, 255, 0.6); font-size: 0.82rem;
  }
  .prose table { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 0.95rem; }
  .prose th, .prose td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--border); text-align: left; }
  .prose th { color: var(--ink); font-weight: 600; }
  .prose hr { border: 0; border-top: 1px solid var(--border); margin: 2.5rem 0; }
  .article-foot { margin-top: 3rem; padding-top: 1.75rem; border-top: 1px solid var(--border); }
  .post-stats {
    display: grid; gap: 0.6rem; margin-top: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    font-family: var(--sans);
  }
  .post-stat {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 10px; padding: 0.7rem 0.8rem;
  }
  .post-stat .v { font-size: 1.15rem; font-weight: 700; color: var(--ink); line-height: 1.15; }
  .post-stat .l { font-size: 0.72rem; color: var(--ink-3); margin-top: 0.15rem; }
  .related { margin-top: 2.5rem; }
  .related a { display: block; padding: 0.85rem 0; border-bottom: 1px solid var(--border); }
  .related a:hover strong { color: var(--accent); }
  .related strong { display: block; color: var(--ink); font-family: var(--serif); font-size: 1.02rem; }
  .related span { font-size: 0.8rem; color: var(--ink-3); }
</style>

  <a href="/" style="font-size:.86rem;color:var(--ink-3)">← All posts</a>

  <article>
    <header class="article-head">
      <h1>${esc(post.title)}</h1>
      ${post.subtitle ? `<p class="sub">${esc(post.subtitle)}</p>` : ''}
      <div class="byline">
        ${avatarMark(getSettings().avatarUrl, getSettings().authorName)}
        <span>
          <span class="who">${esc(getSettings().authorName)}</span><br />
          ${esc(formatDate(post.publishedAt))} · ${mins} min read${post.views ? ` · ${post.views} views` : ''}
        </span>
      </div>
    </header>

    ${highlightBlock(post, 'article')}

    <div class="prose">${renderedHtml}</div>

    <footer class="article-foot">
      <div class="tag-row">
        ${post.tags.map((t) => `<a class="tag" href="/tag/${esc(t)}">${esc(t)}</a>`).join('')}
      </div>

      <div class="post-stats">
        <div class="post-stat"><div class="v">${mins}</div><div class="l">Min read</div></div>
        <div class="post-stat"><div class="v">${words.toLocaleString()}</div><div class="l">Words</div></div>
        <div class="post-stat"><div class="v">${post.tags.length}</div><div class="l">Topic${post.tags.length === 1 ? '' : 's'}</div></div>
        <div class="post-stat"><div class="v">${post.views}</div><div class="l">Views</div></div>
        <div class="post-stat"><div class="v" style="font-size:.92rem">${esc(relativeDate(post.publishedAt))}</div><div class="l">Published</div></div>
        ${
          post.updatedAt !== post.publishedAt
            ? `<div class="post-stat"><div class="v" style="font-size:.92rem">${esc(relativeDate(post.updatedAt))}</div><div class="l">Updated</div></div>`
            : ''
        }
      </div>
    </footer>
  </article>

  ${
    related.length
      ? `<section class="related">
      <div class="section-label">More like this</div>
      ${related
        .map(
          (r) => `<a href="/post/${esc(r.slug)}">
          <strong>${esc(r.title)}</strong>
          <span>${esc(formatDate(r.publishedAt))} · ${readingMinutes(r.content)} min read</span>
        </a>`,
        )
        .join('')}
    </section>`
      : ''
  }`;

  return layout({
    title: `${post.title} — ${getSettings().authorName}`,
    description: post.subtitle || excerpt(post.content, 150),
    body: body + LIGHTBOX_JS,
    variant: 'article',
    path: `/post/${post.slug}`,
    image: firstImage(post.content),
    ogType: 'article',
    publishedAt: post.publishedAt,
    head: `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.subtitle || excerpt(post.content, 150),
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      keywords: post.tags.join(', '),
      author: { '@type': 'Person', name: getSettings().authorName },
    })}</script>`,
  });
}

/** Click any article image to view it full size. */
const LIGHTBOX_JS = `
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
    var img = ev.target.closest('.prose img');

    if (img) {
      if (open) return;
      var box = document.createElement('div');
      box.className = 'lightbox';

      var full = document.createElement('img');
      full.src = img.src;
      full.alt = img.alt || '';
      box.appendChild(full);

      var close_ = document.createElement('button');
      close_.className = 'lightbox-close';
      close_.type = 'button';
      close_.innerHTML = '&times;';
      close_.setAttribute('aria-label', 'Close');
      box.appendChild(close_);

      var hint = document.createElement('div');
      hint.className = 'lightbox-hint';
      hint.textContent = 'Click anywhere or press Esc to close';
      box.appendChild(hint);

      document.body.appendChild(box);
      document.body.style.overflow = 'hidden';
      open = box;
      return;
    }

    // Any click outside the image itself dismisses it.
    if (open && ev.target.tagName !== 'IMG') close();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') close();
  });
})();
</script>`;

export function tagsPage(opts: {
  tags: { tag: string; count: number }[];
  /** The few most-used tags, with their latest posts. */
  featured: { tag: string; count: number; posts: Post[] }[];
  technologies: { term: string; slug: string; count: number }[];
  topics: { term: string; slug: string; count: number }[];
  keywords: { term: string; slug: string; count: number }[];
  postCount: number;
  projectCount: number;
}): string {
  const {
    tags,
    featured,
    technologies,
    topics,
    keywords,
    postCount,
    projectCount,
  } = opts;

  // Cloud weighting: scale font size between the least and most used tag, so
  // the shape of what gets written about is visible at a glance.
  const counts = tags.map((t) => t.count);
  const min = Math.min(...counts, 1);
  const max = Math.max(...counts, 1);
  const weight = (count: number): number => {
    if (max === min) return 1;
    return (count - min) / (max - min);
  };

  const termSection = (
    heading: string,
    blurb: string,
    prefix: string,
    terms: { term: string; slug: string; count: number }[],
  ): string =>
    terms.length
      ? `<section class="explore-section">
    <div class="section-label">${esc(heading)}</div>
    <p class="section-blurb">${esc(blurb)}</p>
    <div class="tag-row">
      ${terms
        .map(
          (t) =>
            `<a class="tag" href="/${prefix}/${esc(t.slug)}">${esc(t.term)} <span style="opacity:.55">${t.count}</span></a>`,
        )
        .join('')}
    </div>
  </section>`
      : '';

  const body = `
<style>
  .explore-hero { padding: 2rem 0 1.5rem; }
  .explore-hero h1 {
    font-family: var(--serif); font-size: clamp(2rem, 5vw, 2.9rem);
    line-height: 1.08; letter-spacing: -0.03em; margin-bottom: 0.7rem;
  }
  .explore-hero p { color: var(--ink-3); font-size: 1.04rem; max-width: 40em; }
  .explore-section { margin-bottom: 3rem; }
  .section-blurb { font-size: 0.88rem; color: var(--ink-3); margin: -0.5rem 0 1rem; }

  .cloud { display: flex; flex-wrap: wrap; gap: 0.5rem 0.6rem; align-items: baseline; }
  .cloud a {
    color: var(--ink-2); border-bottom: 2px solid transparent;
    line-height: 1.3; padding-bottom: 1px;
  }
  .cloud a:hover { color: var(--accent); border-bottom-color: var(--accent); }
  .cloud a .n { font-size: 0.7rem; color: var(--ink-3); vertical-align: super; }

  .featured-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .featured-card {
    border: 1px solid var(--border); border-radius: 12px;
    padding: 1.1rem 1.15rem; background: var(--surface-2);
  }
  .featured-card .head {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 0.5rem; margin-bottom: 0.7rem;
  }
  .featured-card .name {
    font-size: 1rem; font-weight: 700; color: var(--ink);
  }
  .featured-card:hover .name { color: var(--accent); }
  .featured-card .n { font-size: 0.75rem; color: var(--ink-3); white-space: nowrap; }
  .featured-card ul { list-style: none; }
  .featured-card li { padding: 0.3rem 0; border-top: 1px solid var(--border); }
  .featured-card li a { font-size: 0.87rem; color: var(--ink-2); line-height: 1.45; }
  .featured-card li a:hover { color: var(--accent); }

  @media (max-width: 600px) {
    .explore-hero { padding: 1.5rem 0 1.25rem; }
    .explore-hero h1 { font-size: 1.75rem; }
    .explore-hero p { font-size: 0.96rem; }
    .explore-section { margin-bottom: 2.25rem; }
    .featured-grid { grid-template-columns: 1fr; }
    /* Cap the cloud's largest term so one tag cannot dominate a phone screen. */
    .cloud a { font-size: 1.05rem !important; }
  }
</style>

  <section class="explore-hero">
    <h1>Explore</h1>
    <p>
      ${tags.length} tag${tags.length === 1 ? '' : 's'} across ${postCount}
      post${postCount === 1 ? '' : 's'}, plus the technologies and topics behind
      ${projectCount} project${projectCount === 1 ? '' : 's'}. Everything here is a link.
    </p>
  </section>

  ${
    tags.length
      ? `<section class="explore-section">
    <div class="section-label">All tags</div>
    <p class="section-blurb">Sized by how often each one comes up.</p>
    <div class="cloud">
      ${tags
        .map((t) => {
          const size = (0.95 + weight(t.count) * 0.85).toFixed(2);
          const strength = 500 + Math.round(weight(t.count) * 200);
          return `<a href="/tag/${esc(t.tag)}" style="font-size:${size}rem;font-weight:${strength}">${esc(t.tag)}<span class="n">${t.count}</span></a>`;
        })
        .join('')}
    </div>
  </section>`
      : '<div class="empty"><p>No tags yet.</p></div>'
  }

  ${
    featured.length
      ? `<section class="explore-section">
    <div class="section-label">Most written about</div>
    <p class="section-blurb">The recurring themes, with their latest posts.</p>
    <div class="featured-grid">
      ${featured
        .map(
          (f) => `<div class="featured-card">
        <a href="/tag/${esc(f.tag)}">
          <div class="head">
            <span class="name">${esc(f.tag)}</span>
            <span class="n">${f.count} post${f.count === 1 ? '' : 's'}</span>
          </div>
        </a>
        <ul>
          ${f.posts
            .map(
              (p) =>
                `<li><a href="/post/${esc(p.slug)}">${esc(p.title)}</a></li>`,
            )
            .join('')}
        </ul>
      </div>`,
        )
        .join('')}
    </div>
  </section>`
      : ''
  }

  ${termSection(
    'Technologies',
    'What the projects are actually built with.',
    'tech',
    technologies,
  )}

  ${termSection(
    'Project topics',
    'Broader areas the projects fall into.',
    'topics',
    topics,
  )}

  ${termSection(
    'Keywords',
    'Problem domains rather than tools.',
    'keywords',
    keywords,
  )}`;

  return layout({
    title: `Explore — ${getSettings().authorName}`,
    description: `Browse ${tags.length} tags, technologies and topics across the posts and projects of ${getSettings().authorName}.`,
    body,
    path: '/tags',
  });
}

export function notFoundPage(): string {
  return layout({
    title: `Not found — ${getSettings().authorName}`,
    body: `<div class="empty">
      <h1 class="page-title">404</h1>
      <p>That post does not exist, or it is still a draft.</p>
      <p style="margin-top:1.25rem"><a class="btn" href="/">Back to the blog</a></p>
    </div>`,
  });
}
