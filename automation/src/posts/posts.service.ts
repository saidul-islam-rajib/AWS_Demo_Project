import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  Post,
  PostInput,
  normaliseTags,
  slugify,
  readingMinutes,
} from './post.model';

/**
 * JSON-file backed store.
 *
 * DATA_DIR must point at a mounted Docker volume, otherwise posts are lost
 * when the pipeline replaces the container on the next deploy.
 */
@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  private readonly dataDir = process.env.DATA_DIR ?? join(process.cwd(), 'data');
  private readonly file = join(this.dataDir, 'posts.json');
  private posts: Post[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.dataDir)) {
        mkdirSync(this.dataDir, { recursive: true });
      }

      if (existsSync(this.file)) {
        this.posts = JSON.parse(readFileSync(this.file, 'utf8')) as Post[];
        this.logger.log(`Loaded ${this.posts.length} post(s) from ${this.file}`);
        return;
      }

      this.posts = seedPosts();
      this.persist();
      this.logger.log(`Seeded ${this.posts.length} starter post(s)`);
    } catch (err) {
      // A corrupt file must not take the whole app down.
      this.logger.error(`Could not load posts: ${String(err)}`);
      this.posts = [];
    }
  }

  /** Write to a temp file then rename, so a crash mid-write cannot truncate the store. */
  private persist(): void {
    try {
      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, JSON.stringify(this.posts, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save posts: ${String(err)}`);
    }
  }

  private uniqueSlug(title: string, ignoreId?: string): string {
    const base = slugify(title);
    let slug = base;
    let n = 2;

    while (this.posts.some((p) => p.slug === slug && p.id !== ignoreId)) {
      slug = `${base}-${n++}`;
    }

    return slug;
  }

  // ---------- reads ----------

  findAll(): Post[] {
    return [...this.posts].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }

  findPublished(): Post[] {
    return this.findAll().filter((p) => p.status === 'published');
  }

  findBySlug(slug: string): Post {
    const post = this.posts.find((p) => p.slug === slug);
    if (!post) throw new NotFoundException(`No post with slug "${slug}"`);
    return post;
  }

  findById(id: string): Post {
    const post = this.posts.find((p) => p.id === id);
    if (!post) throw new NotFoundException(`No post with id "${id}"`);
    return post;
  }

  /** Published posts matching a free-text query across title, subtitle, body and tags. */
  search(query: string): Post[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.findPublished();

    return this.findPublished().filter((p) =>
      [p.title, p.subtitle, p.content, p.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  byTag(tag: string): Post[] {
    const t = tag.trim().toLowerCase();
    return this.findPublished().filter((p) => p.tags.includes(t));
  }

  /** Every tag in use, with counts, most used first. */
  tagCounts(): { tag: string; count: number }[] {
    const counts = new Map<string, number>();

    for (const post of this.findPublished()) {
      for (const tag of post.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  stats() {
    const published = this.posts.filter((p) => p.status === 'published');
    const drafts = this.posts.filter((p) => p.status === 'draft');
    const words = this.posts.reduce(
      (sum, p) => sum + p.content.trim().split(/\s+/).filter(Boolean).length,
      0,
    );

    return {
      total: this.posts.length,
      published: published.length,
      drafts: drafts.length,
      tags: this.tagCounts().length,
      views: this.posts.reduce((sum, p) => sum + p.views, 0),
      words,
      readingMinutes: this.posts.reduce(
        (sum, p) => sum + readingMinutes(p.content),
        0,
      ),
    };
  }

  recordView(slug: string): void {
    const post = this.posts.find((p) => p.slug === slug);
    if (!post) return;
    post.views += 1;
    this.persist();
  }

  // ---------- writes ----------

  create(input: PostInput): Post {
    const now = new Date().toISOString();
    const title = input.title?.trim() || 'Untitled';

    const post: Post = {
      id: randomUUID(),
      slug: this.uniqueSlug(title),
      title,
      subtitle: input.subtitle?.trim() ?? '',
      content: input.content ?? '',
      highlight: input.highlight?.trim() ?? '',
      tags: normaliseTags(input.tags),
      status: input.status === 'published' ? 'published' : 'draft',
      createdAt: now,
      updatedAt: now,
      views: 0,
    };

    this.posts.push(post);
    this.persist();
    return post;
  }

  update(id: string, input: PostInput): Post {
    const post = this.findById(id);
    const title = input.title?.trim() || post.title;

    // Only re-slug when the title actually changed, so existing links survive edits.
    if (title !== post.title) {
      post.slug = this.uniqueSlug(title, post.id);
    }

    post.title = title;
    post.subtitle = input.subtitle?.trim() ?? '';
    post.content = input.content ?? '';
    post.highlight = input.highlight?.trim() ?? '';
    post.tags = normaliseTags(input.tags);
    post.status = input.status === 'published' ? 'published' : 'draft';
    post.updatedAt = new Date().toISOString();

    this.persist();
    return post;
  }

  remove(id: string): void {
    const index = this.posts.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`No post with id "${id}"`);

    this.posts.splice(index, 1);
    this.persist();
  }
}

/** Starter content so a fresh deploy is not an empty site. */
function seedPosts(): Post[] {
  const now = new Date().toISOString();

  const make = (
    title: string,
    subtitle: string,
    highlight: string,
    tags: string[],
    content: string,
    daysAgo: number,
  ): Post => {
    const created = new Date(Date.now() - daysAgo * 86400000).toISOString();
    return {
      id: randomUUID(),
      slug: slugify(title),
      title,
      subtitle,
      highlight,
      content,
      tags,
      status: 'published',
      createdAt: created,
      updatedAt: created,
      views: 0,
    };
  };

  return [
    make(
      'The commit that pushed nothing',
      'How a nested git repository silently published an empty project',
      'A green push is not proof your code shipped.',
      ['git', 'devops', 'lessons'],
      `My project folder was its own git repository, nested inside another one. When I ran \`git add automation\` from the parent, git did not add the files. It recorded a **gitlink** — a pointer to a commit inside the inner repo.

\`\`\`
$ git ls-files -s
160000 50004e13… 0  automation
\`\`\`

Mode \`160000\` means submodule. There was no \`.gitmodules\` file either, so it was a broken one.

## What it looked like

GitHub showed a grey folder I could not click into. The commit it pointed at only ever existed on my laptop. Every \`git push\` reported success.

## The fix

Remove the inner \`.git\`, drop the gitlink from the index, and add the files properly:

\`\`\`bash
git rm --cached automation
git add automation/
\`\`\`

## Takeaway

Verify the effect, not the acknowledgement. Open the repository on GitHub and confirm the files are actually browsable.`,
      6,
    ),
    make(
      'A typo that killed every stage before stage one',
      'Declarative pipelines compile before they run',
      'Pipeline syntax errors do not fail a stage — they fail before stages exist.',
      ['jenkins', 'ci-cd', 'groovy'],
      `My Jenkinsfile called \`emailtext\` instead of \`emailext\`, and was missing the commas between arguments.

That was not an email bug. A declarative pipeline is compiled as Groovy **before** anything executes, so the parse error meant not a single stage ran.

## Two more in the same file

- \`docker build -t $IMAGE_NAME\` was missing its trailing \`.\` build context
- A \`docker run\` was split across lines with no \`\\\` continuation, so the shell read it as two separate commands

## Takeaway

If the stage view is empty, suspect the Jenkinsfile itself rather than the steps inside it.`,
      5,
    ),
    make(
      'Builds that failed in 0.57 seconds',
      'Build duration is a diagnostic signal',
      'Sub-second failures are almost always configuration, not code.',
      ['jenkins', 'ci-cd', 'debugging'],
      `Three builds in a row failed almost instantly.

That duration is the clue. A real run clones a repository, installs dependencies and builds an image — it takes minutes. Half a second means it died before doing any work at all.

## The cause

**Script Path.** Jenkins looks for \`Jenkinsfile\` at the repository root by default. Mine lived one directory down, so Jenkins found nothing and gave up immediately.

I moved the file to the root rather than fight the setting — CI configuration conventionally belongs there anyway.

## Takeaway

Read the timing before reading the logs. It tells you roughly where in the lifecycle things broke.`,
      4,
    ),
    make(
      'A green webhook that never built anything',
      'Delivered and acted upon are different claims',
      'HTTP 200 means the request was accepted, not that anything happened.',
      ['jenkins', 'webhooks', 'ci-cd'],
      `GitHub showed green checkmarks for every webhook delivery — the initial ping and both pushes. Jenkins was receiving them and returning HTTP 200.

No build ever started.

## Why

Green in GitHub only means the request was **accepted**. Jenkins still has to match the payload to a job, and when it cannot, it drops the request silently.

I switched to \`Poll SCM\` with \`H/5 * * * *\`, which has no matching logic at all — Jenkins simply asks GitHub whether the commit hash changed.

## The trap underneath

Polling compares against the last **successfully built** revision. Every previous build had died before finishing checkout, so there was no baseline to compare against and polling had nothing to detect.

One green build wrote that baseline, and automatic triggering started working immediately.

## Takeaway

When a system reports success, ask what exactly it is claiming succeeded.`,
      3,
    ),
    make(
      'Two users, one Docker socket',
      'Test permissions as the user that will run the command',
      'Group membership does not apply to an already-running process.',
      ['docker', 'linux', 'jenkins'],
      `Jenkins runs as its own system user. The permission that matters is the \`jenkins\` user's, not yours.

Test it the way Jenkins will:

\`\`\`bash
sudo -u jenkins docker ps
\`\`\`

If that fails with a socket permission error:

\`\`\`bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
\`\`\`

The restart is required. A running process does not pick up new group membership, which is why the fix often looks like it did not work.

## Takeaway

\`sudo -u\` is the difference between testing your own access and testing the access that actually matters.`,
      2,
    ),
    make(
      'A small disk fills faster than you think',
      'Image layers accumulate quietly on a 6.6 GB volume',
      'On small instances, cleanup is part of the pipeline, not maintenance for later.',
      ['aws', 'ec2', 'docker'],
      `A single pipeline run moved disk usage from 52.8% to 60.6% on a 6.6 GB root volume — roughly 500 MB per build.

Every run writes a fresh set of image layers, and nothing removes the old ones.

## Why it is nasty

At that rate it is about five builds to a full disk. It does not announce itself as "out of space" either — it surfaces as confusing, unrelated-looking build failures.

## The fix

\`\`\`bash
df -h /
docker system df
docker image prune -f
\`\`\`

I added the prune to the pipeline's \`post { always { … } }\` block so it runs after every build regardless of outcome.

## Takeaway

Storage is a resource your pipeline consumes. Budget for it explicitly.`,
      1,
    ),
  ];
}
