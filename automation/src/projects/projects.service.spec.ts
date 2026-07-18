import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  githubCover,
  normaliseList,
  parseStatus,
  parseYear,
  repoHost,
  termSlug,
} from './project.model';

describe('project.model', () => {
  describe('githubCover', () => {
    it('builds the preview URL for a GitHub repo', () => {
      expect(
        githubCover('https://github.com/saidul-islam-rajib/Portfolio'),
      ).toBe(
        'https://opengraph.githubassets.com/1/saidul-islam-rajib/Portfolio',
      );
    });

    it('strips a trailing .git', () => {
      expect(githubCover('https://github.com/a/b.git')).toBe(
        'https://opengraph.githubassets.com/1/a/b',
      );
    });

    it('returns nothing for a non-GitHub URL', () => {
      expect(githubCover('https://gitlab.com/a/b')).toBe('');
      expect(githubCover('')).toBe('');
    });
  });

  describe('repoHost', () => {
    it('names the host', () => {
      expect(repoHost('https://github.com/a/b')).toBe('GitHub');
      expect(repoHost('https://gitlab.com/a/b')).toBe('GitLab');
      expect(repoHost('https://example.com/a')).toBe('Repository');
    });
  });

  describe('termSlug', () => {
    it('makes a URL-safe segment', () => {
      expect(termSlug('ASP.NET Core')).toBe('asp-net-core');
      expect(termSlug('C++')).toBe('c');
      expect(termSlug('Node.js')).toBe('node-js');
    });
  });

  describe('normaliseList', () => {
    it('lowercases, trims and dedupes', () => {
      expect(normaliseList('Docker, docker , AWS')).toEqual(['docker', 'aws']);
    });

    it('accepts an array', () => {
      expect(normaliseList(['A', 'b'])).toEqual(['a', 'b']);
    });
  });

  describe('parseYear', () => {
    it('finds a four digit year anywhere', () => {
      expect(parseYear('2025')).toBe('2025');
      expect(parseYear('2024-11-21T10:00:00Z')).toBe('2024');
      expect(parseYear('nonsense')).toBe('');
    });
  });

  describe('parseStatus', () => {
    it('defaults to completed for anything unknown', () => {
      expect(parseStatus('ongoing')).toBe('ongoing');
      expect(parseStatus('nonsense')).toBe('completed');
      expect(parseStatus(undefined)).toBe('completed');
    });
  });
});

describe('ProjectsService', () => {
  let dir: string;
  let service: ProjectsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'projects-test-'));
    process.env.DATA_DIR = dir;
    service = new ProjectsService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  const sample = () =>
    service.create({
      title: 'AWS Demo Project',
      description: 'A blog deployed by Jenkins',
      repoUrl: 'https://github.com/saidul-islam-rajib/AWS_Demo_Project',
      technologies: 'TypeScript, Docker',
      topics: 'devops',
      keywords: 'ci-cd',
      tags: 'learning',
      year: '2026',
      status: 'ongoing',
    });

  it('starts empty', () => {
    expect(service.findAll()).toEqual([]);
  });

  it('creates a project with a slug and a GitHub cover', () => {
    const project = sample();

    expect(project.slug).toBe('aws-demo-project');
    expect(project.coverUrl).toContain('opengraph.githubassets.com');
    expect(project.technologies).toEqual(['typescript', 'docker']);
    expect(project.status).toBe('ongoing');
  });

  it('gives colliding titles unique slugs', () => {
    sample();
    const second = service.create({ title: 'AWS Demo Project' });

    expect(second.slug).toBe('aws-demo-project-2');
  });

  it('keeps the slug when the title is unchanged', () => {
    const project = sample();
    const updated = service.update(project.id, {
      title: 'AWS Demo Project',
      description: 'changed',
    });

    expect(updated.slug).toBe('aws-demo-project');
    expect(updated.description).toBe('changed');
  });

  it('groups by year, newest first', () => {
    sample();
    service.create({ title: 'Older', year: '2022' });

    const groups = service.byYear();

    expect(groups.map((g) => g.year)).toEqual(['2026', '2022']);
  });

  it('puts undated projects last', () => {
    sample();
    service.create({ title: 'No year' });

    expect(service.byYear().at(-1)?.year).toBe('Undated');
  });

  it('lists taxonomy terms with counts', () => {
    sample();
    service.create({ title: 'Another', technologies: 'docker' });

    const tech = service.terms('tech');

    expect(tech.find((t) => t.term === 'docker')?.count).toBe(2);
    expect(tech.find((t) => t.term === 'typescript')?.count).toBe(1);
  });

  it('finds projects by taxonomy slug', () => {
    sample();

    expect(service.byTerm('tech', 'typescript')).toHaveLength(1);
    expect(service.byTerm('topics', 'devops')).toHaveLength(1);
    expect(service.byTerm('keywords', 'ci-cd')).toHaveLength(1);
    expect(service.byTerm('tags', 'learning')).toHaveLength(1);
    expect(service.byTerm('tech', 'nothing')).toHaveLength(0);
  });

  it('matches a term whose slug differs from the raw text', () => {
    service.create({ title: 'Dotnet app', technologies: 'ASP.NET Core' });

    expect(service.byTerm('tech', 'asp-net-core')).toHaveLength(1);
  });

  it('resolves a slug back to the original term', () => {
    service.create({ title: 'Dotnet app', technologies: 'ASP.NET Core' });

    expect(service.termLabel('tech', 'asp-net-core')).toBe('asp.net core');
  });

  it('searches across every field', () => {
    sample();

    expect(service.search('jenkins')).toHaveLength(1);
    expect(service.search('typescript')).toHaveLength(1);
    expect(service.search('ci-cd')).toHaveLength(1);
    expect(service.search('absent')).toHaveLength(0);
  });

  it('lists distinct years, newest first', () => {
    sample();
    service.create({ title: 'Older', year: '2022' });

    expect(service.years()).toEqual(['2026', '2022']);
  });

  it('deletes a project', () => {
    const project = sample();
    service.remove(project.id);

    expect(() => service.findById(project.id)).toThrow(NotFoundException);
  });

  it('persists across instances', () => {
    sample();

    expect(new ProjectsService().findAll()).toHaveLength(1);
  });

  it('rejects an unsafe demo URL', () => {
    const project = service.create({
      title: 'Bad link',
      demoUrl: 'javascript:alert(1)',
    });

    expect(project.demoUrl).toBe('');
  });

  it('reports an import with no username configured', async () => {
    const result = await service.importFromGithub('');

    expect(result.added).toBe(0);
    expect(result.error).toBeDefined();
  });
});
