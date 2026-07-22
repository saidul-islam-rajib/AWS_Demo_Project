import { esc } from '../layout';

export interface Crumb {
  label: string;
  href?: string;
}

export function breadcrumbs(trail: Crumb[]): string {
  const parts = trail.map((crumb) =>
    crumb.href
      ? `<a href="${esc(crumb.href)}">${esc(crumb.label)}</a>`
      : `<span>${esc(crumb.label)}</span>`,
  );

  return `<nav class="crumbs">${parts.join('<span class="sep">/</span>')}</nav>`;
}

export function badge(label: string, variant = ''): string {
  return `<span class="level${variant ? ` ${esc(variant)}` : ''}">${esc(label)}</span>`;
}

export function statusPill(status: string): string {
  return status === 'draft'
    ? '<span class="pill draft">Draft</span>'
    : '<span class="pill pub">Published</span>';
}

export function progressBar(ids: string[]): string {
  return `<div class="progress-row" data-progress-for="${esc(ids.join(','))}">
    <span class="progress-track"><span class="progress-fill"></span></span>
    <span data-progress-label>0 of ${ids.length} complete</span>
  </div>`;
}

export function emptyState(message: string, style = ''): string {
  return `<div class="empty-state"${style ? ` style="${esc(style)}"` : ''}><p>${esc(message)}</p></div>`;
}

export function metaSeparator(): string {
  return '<span class="dot">·</span>';
}

export function pluralise(
  count: number,
  singular: string,
  plural?: string,
): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
