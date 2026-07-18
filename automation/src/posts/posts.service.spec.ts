import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';
import {
  highlightList,
  normaliseTags,
  readingMinutes,
  slugify,
} from './post.model';

describe('post.model', () => {
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
