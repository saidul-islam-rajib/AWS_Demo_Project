import { safeUrl } from '../settings/settings.model';
import { slugify } from '../posts/post.model';

export type ProjectStatus = 'completed' | 'ongoing' | 'archived' | 'planned';

export const PROJECT_STATUSES: ProjectStatus[] = [
  'completed',
  'ongoing',
  'archived',
  'planned',
];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  completed: 'Completed',
  ongoing: 'Ongoing',
  archived: 'Archived',
  planned: 'Planned',
};

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string;
  repoUrl: string;
  demoUrl: string;
  technologies: string[];
  tags: string[];
  keywords: string[];
  topics: string[];
  year: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  title?: string;
  description?: string;
  coverUrl?: string;
  repoUrl?: string;
  demoUrl?: string;
  technologies?: string | string[];
  tags?: string | string[];
  keywords?: string | string[];
  topics?: string | string[];
  year?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  featured?: string | boolean;
}

/** The four taxonomies a project can be browsed by. */
export type Taxonomy = 'tech' | 'tags' | 'keywords' | 'topics';

export const TAXONOMY_FIELD: Record<Taxonomy, keyof Project> = {
  tech: 'technologies',
  tags: 'tags',
  keywords: 'keywords',
  topics: 'topics',
};

export const TAXONOMY_LABELS: Record<Taxonomy, string> = {
  tech: 'Technology',
  tags: 'Tag',
  keywords: 'Keyword',
  topics: 'Topic',
};

/**
 * Lowercased, trimmed, deduplicated. Display casing is not preserved because
 * these double as URL segments and must match regardless of how they were typed.
 */
export function normaliseList(value?: string | string[], cap = 20): string[] {
  if (!value) return [];

  const list = Array.isArray(value) ? value : value.split(',');

  return [
    ...new Set(
      list
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, cap),
    ),
  ];
}

/** URL segment for a taxonomy term, e.g. "ASP.NET Core" -> "asp-net-core". */
export function termSlug(term: string): string {
  return slugify(term.replace(/\./g, '-'));
}

export function parseYear(value?: string, fallback?: string): string {
  const match = /\b(19|20)\d{2}\b/.exec(value ?? '');
  if (match) return match[0];
  return fallback ?? '';
}

export function parseStatus(value?: string): ProjectStatus {
  const candidate = (value ?? '').trim().toLowerCase() as ProjectStatus;
  return PROJECT_STATUSES.includes(candidate) ? candidate : 'completed';
}

/** GitHub renders a social preview for every public repo. */
export function githubCover(repoUrl: string): string {
  const match = /github\.com\/([^/]+)\/([^/?#]+)/i.exec(repoUrl);
  if (!match) return '';

  const repo = match[2].replace(/\.git$/, '');
  return `https://opengraph.githubassets.com/1/${match[1]}/${repo}`;
}

export function repoHost(repoUrl: string): string {
  if (/github\.com/i.test(repoUrl)) return 'GitHub';
  if (/gitlab\.com/i.test(repoUrl)) return 'GitLab';
  if (/bitbucket\.org/i.test(repoUrl)) return 'Bitbucket';
  return 'Repository';
}

export function sanitiseInput(
  input: ProjectInput,
): Omit<Project, 'id' | 'slug' | 'createdAt' | 'updatedAt'> {
  const repoUrl = safeUrl(input.repoUrl ?? '');
  const explicitCover = safeUrl(input.coverUrl ?? '');

  return {
    title: (input.title ?? '').trim() || 'Untitled project',
    description: (input.description ?? '').trim(),
    // Fall back to GitHub's generated preview so a project is never imageless.
    coverUrl: explicitCover || githubCover(repoUrl),
    repoUrl,
    demoUrl: safeUrl(input.demoUrl ?? ''),
    technologies: normaliseList(input.technologies),
    tags: normaliseList(input.tags),
    keywords: normaliseList(input.keywords),
    topics: normaliseList(input.topics),
    year: parseYear(input.year),
    startDate: (input.startDate ?? '').trim(),
    endDate: (input.endDate ?? '').trim(),
    status: parseStatus(input.status),
    featured: input.featured === true || input.featured === 'on',
  };
}
