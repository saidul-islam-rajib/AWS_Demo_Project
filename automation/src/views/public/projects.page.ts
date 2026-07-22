import {
  Project,
  STATUS_LABELS,
  Taxonomy,
  TAXONOMY_LABELS,
  repoHost,
  termSlug,
} from '../../projects/project.model';
import { getSettings } from '../../settings/settings.store';
import { esc, IMAGE_SKELETON, layout } from '../shared/layout';

const PROJECTS_CSS = `
<style>
  .proj-hero { padding: 2rem 0 1.75rem; }
  .proj-hero h1 {
    font-family: var(--serif); font-size: clamp(2rem, 5vw, 2.9rem);
    line-height: 1.08; letter-spacing: -0.03em; margin-bottom: 0.7rem;
  }
  .proj-hero p { color: var(--ink-3); max-width: 34em; font-size: 1.04rem; }

  .filters {
    display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
    padding: 1rem 0 1.5rem; margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }
  .filters form { display: flex; gap: 0.5rem; flex: 1; min-width: 240px; }
  .filters input[type="search"] { border-radius: 100px; padding-left: 1rem; }
  .filters select {
    width: auto; border-radius: 100px; padding: 0.5rem 0.9rem; font-size: 0.86rem;
  }
  .chip-link {
    font-size: 0.8rem; padding: 0.3rem 0.75rem; border-radius: 100px;
    border: 1px solid var(--border); color: var(--ink-2); white-space: nowrap;
  }
  .chip-link:hover { border-color: var(--accent); color: var(--accent); }
  .chip-link.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }

  .year-group { margin-bottom: 3rem; }
  .year-head {
    display: flex; align-items: baseline; gap: 0.75rem;
    margin-bottom: 1.25rem; padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--border);
  }
  .year-head h2 {
    font-family: var(--serif); font-size: 1.7rem; letter-spacing: -0.02em;
  }
  .year-head .count { font-size: 0.8rem; color: var(--ink-3); }

  .proj-grid { display: grid; gap: 1.1rem; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
  .proj-card {
    border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
    background: var(--surface); display: flex; flex-direction: column;
    transition: border-color .18s, transform .18s;
  }
  .proj-card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .proj-cover {
    display: block; width: 100%; aspect-ratio: 2 / 1; object-fit: cover;
    border-bottom: 1px solid var(--border);
  }
  .proj-cover-fallback {
    display: grid; place-items: center; aspect-ratio: 2 / 1;
    background: linear-gradient(135deg, var(--surface-2), var(--bg));
    border-bottom: 1px solid var(--border);
    font-family: var(--serif); font-size: 1.5rem; color: var(--ink-3);
  }
  .proj-body { padding: 1rem 1.1rem 1.15rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
  .proj-title { font-size: 1.08rem; line-height: 1.3; }
  .proj-card:hover .proj-title { color: var(--accent); }
  .proj-desc { font-size: 0.88rem; color: var(--ink-3); line-height: 1.55; flex: 1; }
  .proj-meta { display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--ink-3); }
  .status-pill {
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 0.12rem 0.5rem; border-radius: 100px;
    border: 1px solid currentColor;
  }
  .status-completed { color: var(--good); }
  .status-ongoing { color: var(--accent); }
  .status-archived { color: var(--ink-3); }
  .status-planned { color: var(--warn); }
  .tech-row { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .tech-pill {
    font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 5px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  }
  .proj-links { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
  .proj-links a { font-size: 0.78rem; color: var(--accent); }
  .proj-links a:hover { text-decoration: underline; }

  /* ---------- detail ---------- */
  .proj-detail-cover {
    width: 100%; border-radius: 14px; border: 1px solid var(--border);
    margin-bottom: 1.75rem; display: block;
  }
  /*
   * The detail cover is shown at its own proportions, which are unknown until
   * it arrives. Borrow the card ratio while loading so there is an area to
   * shimmer in and the text below does not jump when the image lands.
   */
  .proj-detail-cover.skel:not(.is-loaded) { aspect-ratio: 2 / 1; }
  .detail-head h1 {
    font-family: var(--serif); font-size: clamp(1.9rem, 5vw, 2.6rem);
    line-height: 1.12; letter-spacing: -0.03em; margin-bottom: 0.6rem;
  }
  .detail-head .lead { font-size: 1.06rem; color: var(--ink-2); line-height: 1.65; max-width: 40em; }
  .detail-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin: 1.5rem 0 2rem; }
  .facet { margin-bottom: 1.5rem; }
  .facet h3 {
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-3); font-weight: 700; margin-bottom: 0.55rem;
  }
  .facet .tag-row { gap: 0.4rem; }
  .detail-grid { display: grid; grid-template-columns: 1fr 240px; gap: 2.5rem; align-items: start; }
  @media (max-width: 820px) { .detail-grid { grid-template-columns: 1fr; gap: 1.5rem; } }
  .fact-list { font-size: 0.88rem; }
  .fact-list div { display: flex; justify-content: space-between; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
  @media (max-width: 600px) {
    .proj-hero { padding: 1.5rem 0 1.25rem; }
    .proj-hero h1 { font-size: 1.75rem; }
    .filters { padding: 0.75rem 0 1rem; }
    .filters form { min-width: 0; flex-direction: column; }
    .filters .btn { width: 100%; justify-content: center; }
    .proj-grid { grid-template-columns: 1fr; }
    .year-head h2 { font-size: 1.4rem; }
    .detail-actions .btn { width: 100%; justify-content: center; }
  }
  .fact-list dt { color: var(--ink-3); }
  .fact-list dd { color: var(--ink); font-weight: 600; text-align: right; }

  .proj-detailed {
    font-family: var(--serif); font-size: 1.06rem; line-height: 1.75;
    color: var(--ink-2); margin: 0 0 2rem;
  }
  .proj-detailed > * + * { margin-top: 1.1rem; }
  .proj-detailed h2 { font-size: 1.35rem; font-family: var(--serif); margin-top: 1.75rem; }
  .proj-detailed h3 { font-size: 1.12rem; font-family: var(--serif); margin-top: 1.4rem; }
  .proj-detailed ul, .proj-detailed ol { padding-left: 1.4rem; }
  .proj-detailed li + li { margin-top: 0.35rem; }
  .proj-detailed a { color: var(--accent); text-decoration: underline; }
  .proj-detailed strong { color: var(--ink); }
  .proj-detailed mark {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    color: inherit; padding: 0.05em 0.25em; border-radius: 3px;
  }
  .proj-detailed code {
    font-family: var(--mono); font-size: 0.86em; background: var(--surface-2);
    border: 1px solid var(--border); padding: 0.1em 0.35em; border-radius: 5px;
  }
  .proj-detailed pre {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 10px; padding: 0.95rem 1.1rem; overflow-x: auto;
  }
  .proj-detailed pre code { background: none; border: 0; padding: 0; }
</style>`;

const PROJECTS_HEAD = `${PROJECTS_CSS}
${IMAGE_SKELETON}`;

function cover(project: Project, cls = 'proj-cover'): string {
  return project.coverUrl
    ? `<img class="${cls} skel" src="${esc(project.coverUrl)}" alt="${esc(project.title)}" loading="lazy" />`
    : `<div class="proj-cover-fallback">${esc(project.title.slice(0, 2).toUpperCase())}</div>`;
}

function projectCard(project: Project): string {
  return `
  <article class="proj-card">
    <a href="/projects/${esc(project.slug)}">${cover(project)}</a>
    <div class="proj-body">
      <div class="proj-meta">
        ${project.year ? `<span>${esc(project.year)}</span><span>·</span>` : ''}
        <span class="status-pill status-${esc(project.status)}">${esc(STATUS_LABELS[project.status])}</span>
      </div>
      <a href="/projects/${esc(project.slug)}"><h3 class="proj-title">${esc(project.title)}</h3></a>
      ${project.description && project.showShort !== false ? `<p class="proj-desc">${esc(project.description)}</p>` : ''}
      ${
        project.technologies.length
          ? `<div class="tech-row">${project.technologies
              .slice(0, 4)
              .map(
                (t) =>
                  `<a class="tech-pill" href="/tech/${esc(termSlug(t))}">${esc(t)}</a>`,
              )
              .join('')}</div>`
          : ''
      }
      <div class="proj-links">
        ${project.repoUrl ? `<a href="${esc(project.repoUrl)}" target="_blank" rel="noopener noreferrer">${esc(repoHost(project.repoUrl))} ↗</a>` : ''}
        ${project.demoUrl ? `<a href="${esc(project.demoUrl)}" target="_blank" rel="noopener noreferrer">Live demo ↗</a>` : ''}
      </div>
    </div>
  </article>`;
}

export function projectsPage(opts: {
  groups: { year: string; projects: Project[] }[];
  total: number;
  years: string[];
  techs: { term: string; slug: string; count: number }[];
  query: string;
  activeYear: string;
  activeTech: string;
}): string {
  const { groups, total, years, techs, query, activeYear, activeTech } = opts;
  const s = getSettings();

  const body = `
${PROJECTS_HEAD}
  <section class="proj-hero">
    <h1>Projects</h1>
    <p>Things I have built — ${total} project${total === 1 ? '' : 's'} across ${years.length} year${years.length === 1 ? '' : 's'}. Every technology, tag and topic is clickable.</p>
  </section>

  <div class="filters">
    <form action="/projects" method="get">
      <input type="search" name="q" value="${esc(query)}" placeholder="Search projects…" aria-label="Search projects" />
      ${activeYear ? `<input type="hidden" name="year" value="${esc(activeYear)}" />` : ''}
      ${activeTech ? `<input type="hidden" name="tech" value="${esc(activeTech)}" />` : ''}
      <button class="btn" type="submit">Search</button>
    </form>
  </div>

  <div class="filters" style="border:0;padding-top:0">
    <a class="chip-link ${activeYear ? '' : 'active'}" href="/projects${query ? `?q=${encodeURIComponent(query)}` : ''}">All years</a>
    ${years
      .map(
        (y) =>
          `<a class="chip-link ${activeYear === y ? 'active' : ''}" href="/projects?year=${esc(y)}${query ? `&q=${encodeURIComponent(query)}` : ''}">${esc(y)}</a>`,
      )
      .join('')}
  </div>

  ${
    techs.length
      ? `<div class="filters" style="border:0;padding-top:0;padding-bottom:1.5rem">
    ${techs
      .slice(0, 12)
      .map(
        (t) =>
          `<a class="chip-link ${activeTech === t.slug ? 'active' : ''}" href="/tech/${esc(t.slug)}">${esc(t.term)} <span style="opacity:.6">${t.count}</span></a>`,
      )
      .join('')}
  </div>`
      : ''
  }

  ${
    groups.length
      ? groups
          .map(
            (g) => `<section class="year-group">
      <div class="year-head">
        <h2>${esc(g.year)}</h2>
        <span class="count">${g.projects.length} project${g.projects.length === 1 ? '' : 's'}</span>
      </div>
      <div class="proj-grid">${g.projects.map(projectCard).join('')}</div>
    </section>`,
          )
          .join('')
      : `<div class="empty"><p>No projects match that.</p>
         <p style="margin-top:1rem"><a class="btn btn-ghost" href="/projects">Clear filters</a></p></div>`
  }`;

  return layout({
    title: `Projects — ${s.authorName}`,
    description: `Projects built by ${s.authorName}${s.authorRole ? `, ${s.authorRole}` : ''}.`,
    body,
    path: '/projects',
    image: groups[0]?.projects[0]?.coverUrl,
  });
}

export function projectDetailPage(
  project: Project,
  related: Project[],
  detailedHtml = '',
): string {
  const s = getSettings();

  const facet = (label: string, taxonomy: Taxonomy, items: string[]) =>
    items.length
      ? `<div class="facet">
      <h3>${esc(label)}</h3>
      <div class="tag-row">
        ${items
          .map(
            (i) =>
              `<a class="tag" href="/${taxonomy}/${esc(termSlug(i))}">${esc(i)}</a>`,
          )
          .join('')}
      </div>
    </div>`
      : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: project.title,
    description: project.description,
    codeRepository: project.repoUrl || undefined,
    programmingLanguage: project.technologies,
    keywords: [...project.keywords, ...project.tags, ...project.topics].join(
      ', ',
    ),
    author: { '@type': 'Person', name: s.authorName },
    dateCreated: project.startDate || undefined,
  };

  const body = `
${PROJECTS_HEAD}
  <a href="/projects" style="font-size:.86rem;color:var(--ink-3)">← All projects</a>

  <div class="detail-grid" style="margin-top:1.25rem">
    <div>
      <header class="detail-head">
        <h1>${esc(project.title)}</h1>
        ${project.description && project.showShort !== false ? `<p class="lead">${esc(project.description)}</p>` : ''}
      </header>

      <div class="detail-actions">
        ${project.repoUrl ? `<a class="btn" href="${esc(project.repoUrl)}" target="_blank" rel="noopener noreferrer">View on ${esc(repoHost(project.repoUrl))} ↗</a>` : ''}
        ${project.demoUrl ? `<a class="btn btn-ghost" href="${esc(project.demoUrl)}" target="_blank" rel="noopener noreferrer">Live demo ↗</a>` : ''}
      </div>

      ${project.coverUrl ? `<img class="proj-detail-cover skel" src="${esc(project.coverUrl)}" alt="${esc(project.title)}" />` : ''}

      ${
        detailedHtml && project.showDetailed !== false
          ? `<div class="proj-detailed">${detailedHtml}</div>`
          : ''
      }

      ${facet('Technologies', 'tech', project.technologies)}
      ${facet('Topics', 'topics', project.topics)}
      ${facet('Keywords', 'keywords', project.keywords)}
      ${facet('Tags', 'tags', project.tags)}
    </div>

    <aside>
      <div class="facet">
        <h3>Details</h3>
        <dl class="fact-list">
          <div><dt>Status</dt><dd><span class="status-pill status-${esc(project.status)}">${esc(STATUS_LABELS[project.status])}</span></dd></div>
          ${project.year ? `<div><dt>Year</dt><dd>${esc(project.year)}</dd></div>` : ''}
          ${project.startDate ? `<div><dt>Started</dt><dd>${esc(project.startDate)}</dd></div>` : ''}
          ${project.endDate ? `<div><dt>Finished</dt><dd>${esc(project.endDate)}</dd></div>` : ''}
          ${project.repoUrl ? `<div><dt>Source</dt><dd>${esc(repoHost(project.repoUrl))}</dd></div>` : ''}
        </dl>
      </div>
    </aside>
  </div>

  ${
    related.length
      ? `<section class="year-group" style="margin-top:2.5rem">
    <div class="year-head"><h2 style="font-size:1.2rem">Related projects</h2></div>
    <div class="proj-grid">${related.map(projectCard).join('')}</div>
  </section>`
      : ''
  }`;

  return layout({
    title: `${project.title} — ${s.authorName}`,
    description:
      project.description || `${project.title}, a project by ${s.authorName}.`,
    body,
    path: `/projects/${project.slug}`,
    image: project.coverUrl,
    ogType: 'article',
    publishedAt: project.createdAt,
    head: `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  });
}

export function taxonomyPage(opts: {
  taxonomy: Taxonomy;
  term: string;
  slug: string;
  projects: Project[];
}): string {
  const { taxonomy, term, projects } = opts;
  const s = getSettings();
  const label = TAXONOMY_LABELS[taxonomy];

  const body = `
${PROJECTS_HEAD}
  <section class="proj-hero">
    <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3);font-weight:700;margin-bottom:.5rem">
      ${esc(label)}
    </div>
    <h1>${esc(term)}</h1>
    <p>${projects.length} project${projects.length === 1 ? '' : 's'} tagged with this ${esc(label.toLowerCase())}.</p>
  </section>

  ${
    projects.length
      ? `<div class="proj-grid">${projects.map(projectCard).join('')}</div>`
      : `<div class="empty"><p>Nothing here yet.</p>
         <p style="margin-top:1rem"><a class="btn btn-ghost" href="/projects">All projects</a></p></div>`
  }`;

  return layout({
    title: `${term} — ${label} — ${s.authorName}`,
    description: `Projects by ${s.authorName} involving ${term}.`,
    body,
    path: `/${taxonomy}/${opts.slug}`,
    image: projects[0]?.coverUrl,
  });
}
