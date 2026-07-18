import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from 'fs';
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
  private readonly dataDir =
    process.env.DATA_DIR ?? join(process.cwd(), 'data');
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
        this.logger.log(
          `Loaded ${this.posts.length} post(s) from ${this.file}`,
        );
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

  /**
   * One page of posts, newest first, for the dashboard's infinite scroll.
   * `hasMore` tells the client whether to keep requesting.
   */
  page(
    offset = 0,
    limit = 10,
  ): { posts: Post[]; hasMore: boolean; total: number } {
    const all = this.findAll();
    const start = Math.max(0, offset);
    const size = Math.min(Math.max(1, limit), 50);
    const posts = all.slice(start, start + size);

    return {
      posts,
      hasMore: start + posts.length < all.length,
      total: all.length,
    };
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

  /**
   * Adds any starter post whose slug is not already present.
   *
   * Seeding otherwise only runs on an empty store, so an existing deployment
   * never sees new starter content. Skipping by slug means posts the author
   * has since deleted do not come back, and their own work is untouched.
   */
  importStarters(): { added: number; skipped: number } {
    const existing = new Set(this.posts.map((p) => p.slug));
    const missing = seedPosts().filter((p) => !existing.has(p.slug));

    this.posts.push(...missing);
    if (missing.length) this.persist();

    return { added: missing.length, skipped: 10 - missing.length };
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
      'The sliding window, four patterns deep',
      'Turning O(n·k) into O(n) by not throwing away work you already did',
      `When windows overlap, do not rebuild them — update them.
The inner while loop is still O(n): left only ever moves forward.
Contiguous means window; subsequence does not.`,
      ['algorithms', 'cpp', 'interview'],
      `Most array problems have an obvious brute-force answer: check every window, take the best one. It works, and it is O(n·k).

Consecutive windows overlap almost completely. Only one element leaves and one enters. So instead of recomputing, update.

## The fixed window

\`\`\`cpp
int windowSum = 0;
for (int i = 0; i < k; i++) windowSum += nums[i];

int best = windowSum;
for (int right = k; right < (int)nums.size(); right++) {
    windowSum += nums[right];       // one enters
    windowSum -= nums[right - k];   // one leaves
    best = max(best, windowSum);
}
\`\`\`

The \`right - k\` index is where this goes wrong most often. When \`right\` is the newest element, the oldest sits exactly \`k\` positions behind it.

## The variable window

When the size is not given — *shortest subarray summing to at least target* — both edges move. \`right\` always advances; \`left\` advances only while the window still satisfies the condition.

\`\`\`cpp
int left = 0, windowSum = 0, best = INT_MAX;

for (int right = 0; right < (int)nums.size(); right++) {
    windowSum += nums[right];

    while (windowSum >= target) {
        best = min(best, right - left + 1);
        windowSum -= nums[left];
        left++;
    }
}
\`\`\`

That inner \`while\` looks like it makes this O(n²). It does not — \`left\` only moves forward, at most n times across the whole run.

## When it does not apply

The shrink-while-valid trick assumes positive values. With negatives, adding an element can *decrease* the sum, so a failing window might succeed after growing. That needs prefix sums and a deque instead.`,
      12,
    ),
    make(
      'Why your Docker build takes four minutes every time',
      'Layer caching is ordering-sensitive, and most Dockerfiles get the order wrong',
      `COPY your lockfile before your source, not with it.
Every instruction after a changed layer is rebuilt.
A one-character source edit should never reinstall dependencies.`,
      ['docker', 'devops', 'performance'],
      `Docker caches each instruction as a layer. When one changes, that layer and **every layer after it** is rebuilt. So the order of your Dockerfile decides your build time.

## The common mistake

\`\`\`dockerfile
COPY . .
RUN npm install
RUN npm run build
\`\`\`

\`COPY . .\` includes your source. Change one character in one file and the layer hash changes, so \`npm install\` reruns — reinstalling every dependency to compile a typo fix.

## The fix

\`\`\`dockerfile
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
\`\`\`

Now \`npm install\` only reruns when \`package.json\` or the lockfile actually changes. Source edits invalidate only the last two layers.

## What I measured

In this project's pipeline, the Build stage ran 30s on a source-only change and 9s when layers were fully cached. The first build after a dependency change is the expensive one, and that is correct — it is the only time the work is genuinely needed.

## Also worth doing

Add a \`.dockerignore\`. Without it, \`COPY . .\` ships your local \`node_modules\` into the image, which is both slow and wrong — those are your host's binaries, not the container's.`,
      10,
    ),
    make(
      'The N+1 query problem, and why your ORM hides it',
      'One query for the list, then one more per row, forever',
      `Loop bodies that touch the database are the smell.
Log your SQL in development — the count is the tell.
Fix it by fetching related rows in one query, not by caching the symptom.`,
      ['databases', 'backend', 'performance'],
      `You fetch 50 posts. Then, for each one, you read its author. That is 1 + 50 = 51 queries where 2 would do.

\`\`\`ts
const posts = await postRepo.find();          // 1 query

for (const post of posts) {
  post.author = await userRepo.findOne(post.authorId);  // 50 more
}
\`\`\`

It looks harmless because each individual query is fast. The problem is the round trips. At 5ms each, 50 queries is 250ms of pure latency — and it grows linearly with your data.

## Why ORMs make it easy to miss

Lazy loading means \`post.author\` looks like a property access. There is no visible \`await\`, no obvious query. The code reads like it is working with objects in memory. It is not.

## Finding it

Turn on SQL logging in development and watch the count for a single page load. If loading 50 rows fires 51 statements, you have it. The number scaling with your row count is the confirmation.

## Fixing it

Fetch the related rows in one go — a join, or a second query batched by id:

\`\`\`ts
const posts = await postRepo.find({ relations: ['author'] });
\`\`\`

Two queries regardless of row count.

## The trap

The tempting fix is caching the author lookup. That hides the symptom in development, where your dataset is small and warm, and leaves it fully intact in production where it is not.`,
      9,
    ),
    make(
      'Idempotency keys, or how to make retries safe',
      'The network failed after the charge but before the response — now what',
      `A timeout tells you nothing about whether the work happened.
Idempotency is a property of the endpoint, not of the client.
Store the key with the result, not just the key.`,
      ['api-design', 'backend', 'distributed-systems'],
      `A client calls \`POST /payments\`. The charge succeeds. The response times out on the way back.

The client has no idea whether it worked. If it retries, you might charge twice. If it does not, the user might not be charged at all. Neither is acceptable.

## The shape of the fix

The client generates a unique key per *intent* — not per attempt — and sends it:

\`\`\`
POST /payments
Idempotency-Key: 7f3e9c21-...
\`\`\`

The server, on receiving a request:

1. Look up the key. If it exists **with a stored response**, return that response and do nothing else.
2. If it does not exist, insert it inside the same transaction as the work.
3. Store the response body against the key when you finish.

## The part people miss

Storing only the key is not enough. If you record "this key was seen" but not what you returned, a retry gets a different answer than the original call — often a 409 for something that actually succeeded. The client still cannot tell what happened.

Store the response. Replay it verbatim.

## Which methods need it

\`GET\`, \`PUT\` and \`DELETE\` are already idempotent by definition. \`POST\` is not, which is exactly why it needs the key.

## Expiry

Keys cannot live forever. Twenty-four hours is typical — long enough to cover any sane retry window, short enough that the table does not grow without bound.`,
      8,
    ),
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
