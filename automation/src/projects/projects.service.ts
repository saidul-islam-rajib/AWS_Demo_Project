import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { slugify } from '../posts/post.model';
import { SEED_PROJECTS } from './seed-projects';
import {
  Project,
  ProjectInput,
  TAXONOMY_FIELD,
  Taxonomy,
  githubCover,
  normaliseList,
  parseYear,
  sanitiseInput,
  termSlug,
} from './project.model';

interface GithubRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  fork: boolean;
  archived: boolean;
  created_at: string;
  pushed_at: string;
  stargazers_count: number;
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private projects: Project[] = [];
  private loaded = false;

  private get dataDir(): string {
    return process.env.DATA_DIR ?? join(process.cwd(), 'data');
  }

  private get file(): string {
    return join(this.dataDir, 'projects.json');
  }

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.dataDir))
        mkdirSync(this.dataDir, { recursive: true });

      if (existsSync(this.file)) {
        this.projects = JSON.parse(
          readFileSync(this.file, 'utf8'),
        ) as Project[];
        this.logger.log(`Loaded ${this.projects.length} project(s)`);
      } else {
        this.projects = [];
        for (const seed of SEED_PROJECTS) this.addFromInput(seed);
        this.persist();
        this.logger.log(`Seeded ${this.projects.length} starter project(s)`);
      }
      this.loaded = true;
    } catch (err) {
      this.logger.error(`Could not load projects: ${String(err)}`);
      this.projects = [];
    }
  }

  private persist(): void {
    try {
      if (!existsSync(this.dataDir))
        mkdirSync(this.dataDir, { recursive: true });

      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, JSON.stringify(this.projects, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save projects: ${String(err)}`);
    }
  }

  private uniqueSlug(title: string, ignoreId?: string): string {
    const base = slugify(title);
    let slug = base;
    let n = 2;

    while (this.projects.some((p) => p.slug === slug && p.id !== ignoreId)) {
      slug = `${base}-${n++}`;
    }

    return slug;
  }

  findAll(): Project[] {
    return [...this.projects].sort((a, b) => {
      if (a.year !== b.year)
        return (b.year || '0').localeCompare(a.year || '0');
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  }

  findBySlug(slug: string): Project {
    const project = this.projects.find((p) => p.slug === slug);
    if (!project) throw new NotFoundException(`No project "${slug}"`);
    return project;
  }

  findById(id: string): Project {
    const project = this.projects.find((p) => p.id === id);
    if (!project) throw new NotFoundException(`No project with id "${id}"`);
    return project;
  }

  byYear(projects = this.findAll()): { year: string; projects: Project[] }[] {
    const groups = new Map<string, Project[]>();

    for (const project of projects) {
      const key = project.year || 'Undated';
      const list = groups.get(key) ?? [];
      list.push(project);
      groups.set(key, list);
    }

    return [...groups.entries()]
      .map(([year, list]) => ({ year, projects: list }))
      .sort((a, b) => {
        if (a.year === 'Undated') return 1;
        if (b.year === 'Undated') return -1;
        return b.year.localeCompare(a.year);
      });
  }

  terms(taxonomy: Taxonomy): { term: string; slug: string; count: number }[] {
    const field = TAXONOMY_FIELD[taxonomy];
    const counts = new Map<string, number>();

    for (const project of this.projects) {
      for (const term of project[field] as string[]) {
        counts.set(term, (counts.get(term) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([term, count]) => ({ term, slug: termSlug(term), count }))
      .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
  }

  byTerm(taxonomy: Taxonomy, slug: string): Project[] {
    const field = TAXONOMY_FIELD[taxonomy];
    const target = slug.toLowerCase();

    return this.findAll().filter((p) =>
      (p[field] as string[]).some((term) => termSlug(term) === target),
    );
  }

  termLabel(taxonomy: Taxonomy, slug: string): string {
    const match = this.terms(taxonomy).find(
      (t) => t.slug === slug.toLowerCase(),
    );
    return match?.term ?? slug;
  }

  search(query: string, projects = this.findAll()): Project[] {
    const q = query.trim().toLowerCase();
    if (!q) return projects;

    return projects.filter((p) =>
      [
        p.title,
        p.description,
        p.technologies.join(' '),
        p.tags.join(' '),
        p.keywords.join(' '),
        p.topics.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  years(): string[] {
    return [...new Set(this.projects.map((p) => p.year).filter(Boolean))].sort(
      (a, b) => b.localeCompare(a),
    );
  }

  stats() {
    return {
      total: this.projects.length,
      years: this.years().length,
      technologies: this.terms('tech').length,
      ongoing: this.projects.filter((p) => p.status === 'ongoing').length,
    };
  }

  private addFromInput(input: ProjectInput): Project {
    const now = new Date().toISOString();
    const fields = sanitiseInput(input);

    const project: Project = {
      id: randomUUID(),
      slug: this.uniqueSlug(fields.title),
      ...fields,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.push(project);
    return project;
  }

  create(input: ProjectInput): Project {
    const project = this.addFromInput(input);
    this.persist();
    return project;
  }

  update(id: string, input: ProjectInput): Project {
    const existing = this.findById(id);
    const fields = sanitiseInput(input);

    if (fields.title !== existing.title) {
      existing.slug = this.uniqueSlug(fields.title, existing.id);
    }

    Object.assign(existing, fields, { updatedAt: new Date().toISOString() });
    this.persist();
    return existing;
  }

  remove(id: string): void {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`No project with id "${id}"`);

    this.projects.splice(index, 1);
    this.persist();
  }

  async importFromGithub(
    user: string,
  ): Promise<{ added: number; skipped: number; error?: string }> {
    if (!user.trim()) {
      return { added: 0, skipped: 0, error: 'No GitHub username configured.' };
    }

    let repos: GithubRepo[];

    try {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(user.trim())}/repos?per_page=100&sort=updated`,
        { headers: { Accept: 'application/vnd.github+json' } },
      );

      if (!res.ok) {
        return {
          added: 0,
          skipped: 0,
          error: `GitHub returned ${res.status}. Check the username, or wait if rate limited.`,
        };
      }

      repos = (await res.json()) as GithubRepo[];
    } catch (err) {
      return {
        added: 0,
        skipped: 0,
        error: `Could not reach GitHub: ${String(err)}`,
      };
    }

    const existing = new Set(
      this.projects.map((p) => p.repoUrl.toLowerCase().replace(/\/+$/, '')),
    );

    let added = 0;
    let skipped = 0;

    for (const repo of repos) {
      if (repo.fork) continue;

      const url = repo.html_url.toLowerCase().replace(/\/+$/, '');
      if (existing.has(url)) {
        skipped++;
        continue;
      }

      const now = new Date().toISOString();
      const title = repo.name.replace(/[-_]+/g, ' ').trim();

      this.projects.push({
        id: randomUUID(),
        slug: this.uniqueSlug(title),
        title,
        description: repo.description ?? '',
        detailedDescription: '',
        showShort: true,
        showDetailed: true,
        coverUrl: githubCover(repo.html_url),
        repoUrl: repo.html_url,
        demoUrl: repo.homepage ? repo.homepage : '',
        technologies: normaliseList(repo.language ?? ''),
        tags: normaliseList(repo.topics ?? []),
        keywords: [],
        topics: normaliseList(repo.topics ?? []),
        year: parseYear(repo.pushed_at) || parseYear(repo.created_at),
        startDate: repo.created_at.slice(0, 10),
        endDate: '',
        status: repo.archived ? 'archived' : 'completed',
        featured: repo.stargazers_count > 0,
        createdAt: now,
        updatedAt: now,
      });

      existing.add(url);
      added++;
    }

    if (added) this.persist();
    return { added, skipped };
  }

  get ready(): boolean {
    return this.loaded;
  }
}
