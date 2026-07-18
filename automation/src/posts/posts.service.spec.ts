import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';
import {
  highlightList,
  normaliseRelatedIds,
  normaliseTags,
  readingMinutes,
  relativeDate,
  slugify,
  wordCount,
} from './post.model';

describe('post.model', () => {
  describe('normaliseRelatedIds', () => {
    it('accepts the single string a form sends for one ticked box', () => {
      expect(normaliseRelatedIds('abc')).toEqual(['abc']);
    });

    it('accepts the array a form sends for several', () => {
      expect(normaliseRelatedIds(['a', 'b'])).toEqual(['a', 'b']);
    });

    it('treats an omitted field as no picks at all', () => {
      // Which is what makes the automatic suggestions the default.
      expect(normaliseRelatedIds(undefined)).toEqual([]);
      expect(normaliseRelatedIds('')).toEqual([]);
    });

    it('keeps the order the author sees, and drops duplicates', () => {
      expect(normaliseRelatedIds(['b', 'a', 'b'])).toEqual(['b', 'a']);
    });
  });

  it('slugifies titles', () => {
    expect(slugify('Hello, World! A Post')).toBe('hello-world-a-post');
    expect(slugify('  Trim   Me  ')).toBe('trim-me');
  });

  it('falls back when a title has no usable characters', () => {
    expect(slugify('!!!')).toMatch(/^post-\d+$/);
  });

  it('normalises tags: lowercase, trimmed, deduped, capped at 8', () => {
    expect(normaliseTags('Docker, docker ,  AWS , ')).toEqual([
      'docker',
      'aws',
    ]);
    expect(
      normaliseTags(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']),
    ).toHaveLength(8);
    expect(normaliseTags(undefined)).toEqual([]);
  });

  it('estimates reading time at 200 wpm with a floor of 1', () => {
    expect(readingMinutes('one two three')).toBe(1);
    expect(readingMinutes('word '.repeat(400))).toBe(2);
  });

  describe('highlightList', () => {
    it('splits one takeaway per line', () => {
      expect(highlightList('First point\nSecond point')).toEqual([
        'First point',
        'Second point',
      ]);
    });

    it('keeps a single line as one item', () => {
      expect(highlightList('Only one')).toEqual(['Only one']);
    });

    it('strips bullet characters the user may type', () => {
      expect(highlightList('- dashed\n* starred\n• bulleted')).toEqual([
        'dashed',
        'starred',
        'bulleted',
      ]);
    });

    it('drops blank lines and handles empty input', () => {
      expect(highlightList('a\n\n\n  \nb')).toEqual(['a', 'b']);
      expect(highlightList('')).toEqual([]);
      expect(highlightList(undefined)).toEqual([]);
    });
  });
});

describe('PostsService', () => {
  let dir: string;
  let service: PostsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'blog-test-'));
    process.env.DATA_DIR = dir;
    service = new PostsService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('seeds 10 published starter posts on a fresh data directory', () => {
    expect(service.findAll()).toHaveLength(10);
    expect(service.findPublished()).toHaveLength(10);
  });

  it('gives every seeded post a unique slug', () => {
    const slugs = service.findAll().map((p) => p.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('seeds a spread of topics, not just CI/CD', () => {
    const tags = service.tagCounts().map((t) => t.tag);

    expect(tags).toEqual(
      expect.arrayContaining([
        'algorithms',
        'databases',
        'api-design',
        'docker',
      ]),
    );
    expect(tags.length).toBeGreaterThanOrEqual(10);
  });

  it('seeds both single and multi-line highlights', () => {
    const counts = service
      .findAll()
      .map((p) => highlightList(p.highlight).length);

    expect(counts.some((n) => n === 1)).toBe(true);
    expect(counts.some((n) => n > 1)).toBe(true);
  });

  it('creates a post as a draft by default and hides it from the public feed', () => {
    const post = service.create({ title: 'My First Post', content: 'hello' });

    expect(post.status).toBe('draft');
    expect(post.slug).toBe('my-first-post');
    expect(service.findPublished().map((p) => p.id)).not.toContain(post.id);
  });

  it('publishes when asked', () => {
    const post = service.create({
      title: 'Published One',
      content: 'body',
      status: 'published',
      tags: 'aws, jenkins',
    });

    expect(service.findPublished().map((p) => p.id)).toContain(post.id);
    expect(post.tags).toEqual(['aws', 'jenkins']);
  });

  it('gives colliding titles unique slugs', () => {
    const a = service.create({ title: 'Same Title', content: 'a' });
    const b = service.create({ title: 'Same Title', content: 'b' });

    expect(a.slug).toBe('same-title');
    expect(b.slug).toBe('same-title-2');
  });

  it('updates a post and keeps the slug when the title is unchanged', () => {
    const post = service.create({ title: 'Keep Slug', content: 'v1' });
    const updated = service.update(post.id, {
      title: 'Keep Slug',
      content: 'v2',
    });

    expect(updated.slug).toBe('keep-slug');
    expect(updated.content).toBe('v2');
  });

  it('re-slugs when the title changes', () => {
    const post = service.create({ title: 'Old Title', content: 'x' });
    const updated = service.update(post.id, {
      title: 'New Title',
      content: 'x',
    });

    expect(updated.slug).toBe('new-title');
  });

  it('deletes a post', () => {
    const post = service.create({ title: 'Delete Me', content: 'x' });
    service.remove(post.id);

    expect(() => service.findById(post.id)).toThrow(NotFoundException);
  });

  it('throws when deleting something that does not exist', () => {
    expect(() => service.remove('no-such-id')).toThrow(NotFoundException);
  });

  it('searches across title, body and tags, published only', () => {
    service.create({
      title: 'Kubernetes Notes',
      content: 'about pods',
      status: 'published',
      tags: 'k8s',
    });
    service.create({
      title: 'Secret Draft',
      content: 'kubernetes',
      status: 'draft',
    });

    const hits = service.search('kubernetes');

    expect(hits.some((p) => p.title === 'Kubernetes Notes')).toBe(true);
    expect(hits.some((p) => p.title === 'Secret Draft')).toBe(false);
  });

  it('filters by tag and counts tags', () => {
    service.create({
      title: 'Tagged Post',
      content: 'x',
      status: 'published',
      tags: 'terraform',
    });

    expect(service.byTag('terraform')).toHaveLength(1);
    expect(service.tagCounts().find((t) => t.tag === 'terraform')?.count).toBe(
      1,
    );
  });

  describe('relativeDate and wordCount', () => {
    it('describes recency in words', () => {
      const days = (n: number) =>
        new Date(Date.now() - n * 86400000).toISOString();

      expect(relativeDate(days(0))).toBe('today');
      expect(relativeDate(days(1))).toBe('yesterday');
      expect(relativeDate(days(5))).toBe('5 days ago');
      expect(relativeDate(days(60))).toBe('2 months ago');
      expect(relativeDate(days(400))).toBe('1 year ago');
    });

    it('counts words, ignoring extra whitespace', () => {
      expect(wordCount('one two three')).toBe(3);
      expect(wordCount('  spaced   out  ')).toBe(2);
      expect(wordCount('')).toBe(0);
    });
  });

  describe('page', () => {
    it('returns the first page with hasMore set', () => {
      const result = service.page(0, 4);

      expect(result.posts).toHaveLength(4);
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(10);
    });

    it('returns the last page with hasMore false', () => {
      const result = service.page(8, 4);

      expect(result.posts).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('returns nothing past the end', () => {
      const result = service.page(50, 10);

      expect(result.posts).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('does not repeat or skip posts across pages', () => {
      const first = service.page(0, 4).posts.map((p) => p.id);
      const second = service.page(4, 4).posts.map((p) => p.id);
      const third = service.page(8, 4).posts.map((p) => p.id);
      const all = [...first, ...second, ...third];

      expect(all).toHaveLength(10);
      expect(new Set(all).size).toBe(10);
    });

    it('keeps newest-first ordering', () => {
      const paged = [...service.page(0, 5).posts, ...service.page(5, 5).posts];
      const direct = service.findAll();

      expect(paged.map((p) => p.id)).toEqual(direct.map((p) => p.id));
    });

    it('clamps a negative offset and an oversized limit', () => {
      expect(service.page(-5, 3).posts).toHaveLength(3);
      expect(service.page(0, 999).posts).toHaveLength(10);
    });
  });

  describe('importStarters', () => {
    it('adds nothing when every starter is already present', () => {
      const result = service.importStarters();

      expect(result.added).toBe(0);
      expect(result.skipped).toBe(10);
      expect(service.findAll()).toHaveLength(10);
    });

    it('restores only the starters that are missing', () => {
      const [first, second] = service.findAll();
      service.remove(first.id);
      service.remove(second.id);
      expect(service.findAll()).toHaveLength(8);

      const result = service.importStarters();

      expect(result.added).toBe(2);
      expect(service.findAll()).toHaveLength(10);
    });

    it('leaves the author’s own posts untouched', () => {
      const mine = service.create({
        title: 'My Own Post',
        content: 'mine',
        status: 'published',
      });

      service.importStarters();

      const still = service.findById(mine.id);
      expect(still.title).toBe('My Own Post');
      expect(still.content).toBe('mine');
    });

    it('does not duplicate on a second run', () => {
      service.importStarters();
      service.importStarters();

      expect(service.findAll()).toHaveLength(10);
    });
  });

  it('counts views', () => {
    const post = service.create({
      title: 'Viewed',
      content: 'x',
      status: 'published',
    });
    service.recordView(post.slug);
    service.recordView(post.slug);

    expect(service.findById(post.id).views).toBe(2);
  });

  it('persists across instances', () => {
    service.create({ title: 'Durable', content: 'x', status: 'published' });

    const reloaded = new PostsService();

    expect(reloaded.findAll().some((p) => p.title === 'Durable')).toBe(true);
  });
});
