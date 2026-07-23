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
import { normaliseTags, slugify } from '../posts/post.model';
import {
  Difficulty,
  Neighbours,
  Subject,
  SubjectInput,
  SubjectStats,
  Tutorial,
  TutorialInput,
  TutorialStore,
  applyOrder,
  lessonsOf,
  moveInSequence,
  neighbours,
  nextOrder,
  normaliseIcon,
  parseDifficulty,
  parseStatus,
  publishedOnly,
  resequence,
  searchTutorials,
  sortByOrder,
  subjectStats,
} from './tutorial.model';

@Injectable()
export class TutorialsService {
  private readonly logger = new Logger(TutorialsService.name);
  private readonly dataDir =
    process.env.DATA_DIR ?? join(process.cwd(), 'data');
  private readonly file = join(this.dataDir, 'tutorials.json');

  private subjects: Subject[] = [];
  private tutorials: Tutorial[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.dataDir)) {
        mkdirSync(this.dataDir, { recursive: true });
      }

      if (existsSync(this.file)) {
        const stored = JSON.parse(
          readFileSync(this.file, 'utf8'),
        ) as Partial<TutorialStore>;

        this.subjects = (stored.subjects ?? []).map((subject) => ({
          ...subject,
          summary: subject.summary ?? '',
          icon: subject.icon ?? '',
          status: subject.status ?? 'published',
          order: subject.order ?? 0,
        }));

        this.tutorials = (stored.tutorials ?? []).map((tutorial) => ({
          ...tutorial,
          summary: tutorial.summary ?? '',
          tags: tutorial.tags ?? [],
          difficulty: tutorial.difficulty ?? 'beginner',
          status: tutorial.status ?? 'published',
          order: tutorial.order ?? 0,
          views: tutorial.views ?? 0,
        }));

        this.logger.log(
          `Loaded ${this.subjects.length} subject(s) and ${this.tutorials.length} tutorial(s)`,
        );
        return;
      }

      const seeded = seedTutorials();
      this.subjects = seeded.subjects;
      this.tutorials = seeded.tutorials;
      this.persist();
      this.logger.log(
        `Seeded ${this.subjects.length} starter subject(s) and ${this.tutorials.length} tutorial(s)`,
      );
    } catch (err) {
      this.logger.error(`Could not load tutorials: ${String(err)}`);
      this.subjects = [];
      this.tutorials = [];
    }
  }

  private persist(): void {
    try {
      const tmp = `${this.file}.tmp`;
      const payload: TutorialStore = {
        subjects: this.subjects,
        tutorials: this.tutorials,
      };
      writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save tutorials: ${String(err)}`);
    }
  }

  private uniqueSubjectSlug(title: string, ignoreId?: string): string {
    const base = slugify(title) || 'subject';
    let slug = base;
    let n = 2;

    while (this.subjects.some((s) => s.slug === slug && s.id !== ignoreId)) {
      slug = `${base}-${n++}`;
    }

    return slug;
  }

  private uniqueTutorialSlug(
    title: string,
    subjectId: string,
    ignoreId?: string,
  ): string {
    const base = slugify(title) || 'lesson';
    let slug = base;
    let n = 2;

    while (
      this.tutorials.some(
        (t) =>
          t.subjectId === subjectId && t.slug === slug && t.id !== ignoreId,
      )
    ) {
      slug = `${base}-${n++}`;
    }

    return slug;
  }

  findSubjects(includeDrafts = false): Subject[] {
    return sortByOrder(
      includeDrafts ? this.subjects : publishedOnly(this.subjects),
    );
  }

  findSubjectBySlug(slug: string, includeDrafts = false): Subject {
    const subject = this.findSubjects(includeDrafts).find(
      (s) => s.slug === slug,
    );
    if (!subject) throw new NotFoundException(`No subject "${slug}"`);
    return subject;
  }

  findSubjectById(id: string): Subject {
    const subject = this.subjects.find((s) => s.id === id);
    if (!subject) throw new NotFoundException(`No subject with id "${id}"`);
    return subject;
  }

  lessons(subjectId: string, includeDrafts = false): Tutorial[] {
    return lessonsOf(this.tutorials, subjectId, includeDrafts);
  }

  stats(subjectId: string): SubjectStats {
    return subjectStats(this.tutorials, subjectId);
  }

  findTutorial(
    subjectSlug: string,
    tutorialSlug: string,
    includeDrafts = false,
  ): Tutorial {
    const subject = this.findSubjectBySlug(subjectSlug, includeDrafts);

    const tutorial = this.lessons(subject.id, includeDrafts).find(
      (t) => t.slug === tutorialSlug,
    );

    if (!tutorial) {
      throw new NotFoundException(
        `No tutorial "${tutorialSlug}" in "${subjectSlug}"`,
      );
    }

    return tutorial;
  }

  findTutorialById(id: string): Tutorial {
    const tutorial = this.tutorials.find((t) => t.id === id);
    if (!tutorial) throw new NotFoundException(`No tutorial with id "${id}"`);
    return tutorial;
  }

  neighbours(subjectId: string, tutorialId: string): Neighbours {
    return neighbours(this.lessons(subjectId), tutorialId);
  }

  private liveSubjectIds(): Set<string> {
    return new Set(publishedOnly(this.subjects).map((subject) => subject.id));
  }

  allTutorials(includeDrafts = false): Tutorial[] {
    if (includeDrafts) return [...this.tutorials];

    const live = this.liveSubjectIds();

    return publishedOnly(this.tutorials).filter((tutorial) =>
      live.has(tutorial.subjectId),
    );
  }

  search(query: string): Tutorial[] {
    return searchTutorials(this.allTutorials(), query);
  }

  searchWithSubject(query: string): { tutorial: Tutorial; subject: Subject }[] {
    const bySubject = new Map(
      this.findSubjects().map((subject) => [subject.id, subject]),
    );

    return this.search(query).flatMap((tutorial) => {
      const subject = bySubject.get(tutorial.subjectId);
      return subject ? [{ tutorial, subject }] : [];
    });
  }

  totals(): { subjects: number; tutorials: number; minutes: number } {
    const subjects = publishedOnly(this.subjects);

    return {
      subjects: subjects.length,
      tutorials: subjects.reduce(
        (sum, subject) => sum + this.stats(subject.id).total,
        0,
      ),
      minutes: subjects.reduce(
        (sum, subject) => sum + this.stats(subject.id).minutes,
        0,
      ),
    };
  }

  createSubject(input: SubjectInput): Subject {
    const now = new Date().toISOString();
    const title = input.title.trim();

    const subject: Subject = {
      id: randomUUID(),
      slug: this.uniqueSubjectSlug(title),
      title,
      summary: (input.summary ?? '').trim(),
      icon: normaliseIcon(input.icon),
      order: nextOrder(this.subjects),
      status: parseStatus(input.status),
      createdAt: now,
      updatedAt: now,
    };

    this.subjects.push(subject);
    this.persist();

    return subject;
  }

  updateSubject(id: string, input: SubjectInput): Subject {
    const index = this.subjects.findIndex((s) => s.id === id);
    if (index === -1) throw new NotFoundException(`No subject with id "${id}"`);

    const current = this.subjects[index];
    const title = input.title.trim();

    const updated: Subject = {
      ...current,
      title,
      slug:
        title === current.title
          ? current.slug
          : this.uniqueSubjectSlug(title, id),
      summary: (input.summary ?? '').trim(),
      icon: normaliseIcon(input.icon),
      status: parseStatus(input.status),
      updatedAt: new Date().toISOString(),
    };

    this.subjects[index] = updated;
    this.persist();

    return updated;
  }

  removeSubject(id: string): void {
    const index = this.subjects.findIndex((s) => s.id === id);
    if (index === -1) throw new NotFoundException(`No subject with id "${id}"`);

    this.subjects.splice(index, 1);
    this.tutorials = this.tutorials.filter((t) => t.subjectId !== id);
    this.subjects = resequence(this.subjects);
    this.persist();
  }

  moveSubject(id: string, direction: 'up' | 'down'): void {
    this.subjects = moveInSequence(this.subjects, id, direction);
    this.persist();
  }

  reorderSubjects(ids: string[]): void {
    this.subjects = applyOrder(this.subjects, ids);
    this.persist();
  }

  reorderTutorials(subjectId: string, ids: string[]): void {
    const scoped = this.tutorials.filter((t) => t.subjectId === subjectId);

    this.tutorials = [
      ...this.tutorials.filter((t) => t.subjectId !== subjectId),
      ...applyOrder(scoped, ids),
    ];

    this.persist();
  }

  createTutorial(input: TutorialInput): Tutorial {
    const subject = this.findSubjectById(input.subjectId);
    const now = new Date().toISOString();
    const title = input.title.trim();

    const tutorial: Tutorial = {
      id: randomUUID(),
      subjectId: subject.id,
      slug: this.uniqueTutorialSlug(title, subject.id),
      title,
      summary: (input.summary ?? '').trim(),
      content: input.content,
      difficulty: parseDifficulty(input.difficulty),
      order: nextOrder(
        this.tutorials.filter((t) => t.subjectId === subject.id),
      ),
      status: parseStatus(input.status),
      tags: normaliseTags(input.tags),
      createdAt: now,
      updatedAt: now,
      views: 0,
    };

    this.tutorials.push(tutorial);
    this.persist();

    return tutorial;
  }

  updateTutorial(id: string, input: TutorialInput): Tutorial {
    const index = this.tutorials.findIndex((t) => t.id === id);
    if (index === -1)
      throw new NotFoundException(`No tutorial with id "${id}"`);

    const current = this.tutorials[index];
    const subject = this.findSubjectById(input.subjectId || current.subjectId);
    const title = input.title.trim();
    const movedSubject = subject.id !== current.subjectId;

    const updated: Tutorial = {
      ...current,
      subjectId: subject.id,
      title,
      slug:
        title === current.title && !movedSubject
          ? current.slug
          : this.uniqueTutorialSlug(title, subject.id, id),
      summary: (input.summary ?? '').trim(),
      content: input.content,
      difficulty: parseDifficulty(input.difficulty),
      order: movedSubject
        ? nextOrder(this.tutorials.filter((t) => t.subjectId === subject.id))
        : current.order,
      status: parseStatus(input.status),
      tags: normaliseTags(input.tags),
      updatedAt: new Date().toISOString(),
    };

    this.tutorials[index] = updated;
    this.persist();

    return updated;
  }

  removeTutorial(id: string): string {
    const index = this.tutorials.findIndex((t) => t.id === id);
    if (index === -1)
      throw new NotFoundException(`No tutorial with id "${id}"`);

    const { subjectId } = this.tutorials[index];
    this.tutorials.splice(index, 1);

    const remaining = resequence(
      this.tutorials.filter((t) => t.subjectId === subjectId),
    );
    this.tutorials = [
      ...this.tutorials.filter((t) => t.subjectId !== subjectId),
      ...remaining,
    ];

    this.persist();

    return subjectId;
  }

  moveTutorial(id: string, direction: 'up' | 'down'): string {
    const tutorial = this.findTutorialById(id);
    const scoped = this.tutorials.filter(
      (t) => t.subjectId === tutorial.subjectId,
    );

    const reordered = moveInSequence(scoped, id, direction);

    this.tutorials = [
      ...this.tutorials.filter((t) => t.subjectId !== tutorial.subjectId),
      ...reordered,
    ];

    this.persist();

    return tutorial.subjectId;
  }

  recordView(id: string): void {
    const tutorial = this.tutorials.find((t) => t.id === id);
    if (!tutorial) return;

    tutorial.views += 1;
    this.persist();
  }
}

function seedTutorials(): TutorialStore {
  const now = new Date().toISOString();

  const networking: Subject = {
    id: randomUUID(),
    slug: 'networking',
    title: 'Networking',
    summary:
      'How machines find each other and move bytes between them, from addressing up to the request your browser makes.',
    icon: '🌐',
    order: 1,
    status: 'published',
    createdAt: now,
    updatedAt: now,
  };

  const lesson = (
    order: number,
    title: string,
    summary: string,
    difficulty: Difficulty,
    content: string,
  ): Tutorial => ({
    id: randomUUID(),
    subjectId: networking.id,
    slug: slugify(title),
    title,
    summary,
    content,
    difficulty,
    order,
    status: 'published',
    tags: ['networking'],
    createdAt: now,
    updatedAt: now,
    views: 0,
  });

  return {
    subjects: [networking],
    tutorials: [
      lesson(
        1,
        'What an IP address actually is',
        'Addressing, subnets and why 192.168.x.x keeps showing up on your home network.',
        'beginner',
        `## Addressing\n\nEvery device on a network needs a way to be found. An IP address is that identifier.\n\n### IPv4\n\nFour numbers, each 0-255, written with dots: \`192.168.1.14\`. That is 32 bits, which allows about 4.3 billion addresses — far fewer than there are devices, which is why private ranges and NAT exist.\n\n### Private ranges\n\nThree blocks are reserved for private networks and are never routed on the public internet:\n\n- \`10.0.0.0/8\`\n- \`172.16.0.0/12\`\n- \`192.168.0.0/16\`\n\nYour router hands you one of these, then translates between it and its single public address on the way out.`,
      ),
      lesson(
        2,
        'DNS: turning names into addresses',
        'What happens between typing a hostname and the first packet leaving your machine.',
        'beginner',
        `## The lookup\n\nComputers route on addresses, people remember names. DNS is the translation layer between the two.\n\n### The chain\n\n1. The browser checks its own cache\n2. Then the operating system cache\n3. Then the configured resolver, usually your router or a public one\n4. The resolver walks the hierarchy: root servers, then the top-level domain, then the authoritative server for the domain\n\n### Why TTL matters\n\nEvery record carries a time-to-live. A low TTL makes changes propagate quickly but increases lookup traffic. Lower it a day *before* you plan to move a service, not on the day.`,
      ),
      lesson(
        3,
        'TCP, UDP and what a port is for',
        'Two ways to send data, and why one of them checks its work.',
        'intermediate',
        `## Two transports\n\nAn IP address gets you to a machine. A port gets you to a program on it.\n\n### TCP\n\nConnection-oriented. It performs a handshake, numbers every segment, retransmits what goes missing and delivers bytes in order. Anything where correctness matters more than latency uses it: HTTP, SSH, database protocols.\n\n### UDP\n\nFire and forget. No handshake, no retransmission, no ordering. That sounds worse until you are carrying live audio, where a packet arriving late is worth less than nothing.\n\n### Ports worth memorising\n\n| Port | Service |\n|---|---|\n| 22 | SSH |\n| 53 | DNS |\n| 80 | HTTP |\n| 443 | HTTPS |`,
      ),
    ],
  };
}
