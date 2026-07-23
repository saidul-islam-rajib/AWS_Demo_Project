import { readFileSync } from 'fs';
import { join } from 'path';
import { TUTORIALS_STYLES } from './public/tutorials.styles';
import { TUTORIALS_ADMIN_STYLES } from './admin/tutorials.styles';
import { tutorialPage, tutorialsIndexPage } from './public/tutorials.page';
import { homePage, SIDEBAR_TAG_LIMIT } from './public/posts.pages';
import { subjectLessonsPage, tutorialsAdminPage } from './admin/tutorials.page';
import {
  AUTO_COMPLETE_DELAY_MS,
  PROGRESS_TRACKER_SCRIPT,
} from './shared/scripts/progress-tracker';
import { Difficulty, Subject, Tutorial } from '../tutorials/tutorial.model';

const subject: Subject = {
  id: 's1',
  slug: 'networking',
  title: 'Networking',
  summary: 'How machines find each other.',
  icon: '🌐',
  order: 1,
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const lesson: Tutorial = {
  id: 't1',
  subjectId: 's1',
  slug: 'ip-addresses',
  title: 'What an IP address is',
  summary: 'Addressing and subnets.',
  content: '## Addressing\n\nBody text.',
  difficulty: 'beginner',
  order: 1,
  status: 'published',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  views: 0,
};

const lessonHtml = (): string =>
  tutorialPage(
    subject,
    lesson,
    [lesson],
    { position: 1, total: 1 },
    '<p>body</p>',
  );

const indexHtml = (difficulties: string[]): string =>
  tutorialsIndexPage(
    [subject],
    new Map([
      [
        subject.id,
        {
          total: difficulties.length,
          minutes: 3,
          difficulties: difficulties as Difficulty[],
        },
      ],
    ]),
    new Map([[subject.id, difficulties.length ? ['a'] : []]]),
    { subjects: 1, tutorials: difficulties.length, minutes: 3 },
  );

const layoutSource = readFileSync(
  join(__dirname, 'shared', 'layout.ts'),
  'utf8',
);

const DEFINED = new Set(
  [...layoutSource.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]),
);

const sheets: [string, string][] = [
  ['public tutorials', TUTORIALS_STYLES],
  ['admin tutorials', TUTORIALS_ADMIN_STYLES],
];

describe('stylesheet integrity', () => {
  it('finds the custom properties the layout defines', () => {
    expect(DEFINED.has('--ink')).toBe(true);
    expect(DEFINED.has('--accent')).toBe(true);
    expect(DEFINED.size).toBeGreaterThan(10);
  });

  it.each(sheets)('%s references only defined custom properties', (_n, css) => {
    const used = [...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
    const unknown = [...new Set(used)].filter((name) => !DEFINED.has(name));

    expect(unknown).toEqual([]);
  });

  it.each(sheets)('%s has balanced braces', (_n, css) => {
    const opens = (css.match(/\{/g) ?? []).length;
    const closes = (css.match(/\}/g) ?? []).length;

    expect(opens).toBe(closes);
  });

  it.each(sheets)('%s emits exactly one style element', (_n, css) => {
    expect((css.match(/<style>/g) ?? []).length).toBe(1);
    expect((css.match(/<\/style>/g) ?? []).length).toBe(1);
  });
});

describe('clickable cards', () => {
  it('stretches the subject title link across the whole card', () => {
    expect(TUTORIALS_STYLES).toContain('.subj-card {\n    position: relative;');
    expect(TUTORIALS_STYLES).toContain(
      '.subj-card h2 a::after { content: ""; position: absolute; inset: 0;',
    );
  });

  it('stretches the lesson title link across the whole row', () => {
    expect(TUTORIALS_STYLES).toContain(
      '.lesson-item {\n    position: relative;',
    );
    expect(TUTORIALS_STYLES).toContain(
      '.lesson-body h3 a::after { content: ""; position: absolute; inset: 0;',
    );
  });

  it('shows the accent border when a card is focused by keyboard', () => {
    expect(TUTORIALS_STYLES).toContain('.subj-card:focus-within');
    expect(TUTORIALS_STYLES).toContain('.lesson-item:focus-within');
  });
});

describe('automatic completion', () => {
  it('places a sentinel at the end of the lesson content', () => {
    const html = lessonHtml();

    const contentAt = html.indexOf('class="prose"');
    const sentinelAt = html.indexOf('data-lesson-end');
    const navAt = html.indexOf('class="tut-nav"');

    expect(sentinelAt).toBeGreaterThan(contentAt);
    expect(sentinelAt).toBeLessThan(navAt);
  });

  it('hides the sentinel from assistive technology', () => {
    expect(lessonHtml()).toContain('data-lesson-end aria-hidden="true"');
  });

  it('keeps a manual toggle so a wrong guess can be undone', () => {
    const html = lessonHtml();

    expect(html).toContain('data-mark-done="t1"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('tells the reader completion is automatic', () => {
    expect(lessonHtml()).toContain(
      'Marked automatically once you reach the end',
    );
  });

  it('observes the sentinel and marks after a dwell', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('[data-lesson-end]');
    expect(PROGRESS_TRACKER_SCRIPT).toContain('IntersectionObserver');
    expect(PROGRESS_TRACKER_SCRIPT).toContain(
      `var DWELL = ${AUTO_COMPLETE_DELAY_MS}`,
    );
  });

  it('cancels the pending mark when the reader scrolls away', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('window.clearTimeout(timer)');
  });

  it('does not re-mark a lesson the reader has already completed', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain(
      'if (!isDone(id) && timer === null)',
    );
  });

  it('degrades without IntersectionObserver rather than throwing', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain(
      "typeof window.IntersectionObserver === 'function'",
    );
  });
});

describe('difficulty range', () => {
  it('shows a single badge when every lesson is the same level', () => {
    const html = indexHtml(['beginner']);

    expect(html).toContain('>Beginner<');
    expect(html).not.toContain('–');
  });

  it('collapses several levels into one range badge', () => {
    const html = indexHtml(['beginner', 'intermediate', 'advanced']);

    expect(html).toContain('>Beginner–Advanced<');
    expect(html).not.toContain('>Intermediate<');
  });

  it('shows nothing when a subject has no lessons', () => {
    expect(indexHtml([])).not.toContain('class="level');
  });
});

describe('home sidebar tag list', () => {
  const homeWith = (count: number): string => {
    const tags = Array.from({ length: count }, (_, i) => ({
      tag: `tag-${String(i).padStart(2, '0')}`,
      count: count - i,
    }));

    return homePage({
      posts: [],
      tags,
      stats: {
        published: 1,
        tags: count,
        words: 10,
        readingMinutes: 1,
      },
    });
  };

  const tagLinks = (html: string): string[] => {
    const side = html.slice(html.indexOf('Browse tags'));
    return [...side.matchAll(/class="tag" href="\/tag\/([^"]+)"/g)].map(
      (m) => m[1],
    );
  };

  it(`shows at most ${SIDEBAR_TAG_LIMIT} tags`, () => {
    expect(tagLinks(homeWith(63))).toHaveLength(SIDEBAR_TAG_LIMIT);
  });

  it('shows the most used tags, not an arbitrary slice', () => {
    const shown = tagLinks(homeWith(63));

    expect(shown[0]).toBe('tag-00');
    expect(shown).not.toContain('tag-62');
  });

  it('links to the tags page with the full count when truncated', () => {
    expect(homeWith(63)).toContain('See all 63 tags →');
    expect(homeWith(63)).toContain('class="rail-more" href="/tags"');
  });

  it('shows every tag and no link when the list is short', () => {
    const html = homeWith(5);

    expect(tagLinks(html)).toHaveLength(5);
    expect(html).not.toContain('class="rail-more" href');
  });

  it('shows no link at exactly the limit', () => {
    const html = homeWith(SIDEBAR_TAG_LIMIT);

    expect(tagLinks(html)).toHaveLength(SIDEBAR_TAG_LIMIT);
    expect(html).not.toContain('class="rail-more" href');
  });

  it('handles having no tags at all', () => {
    const html = homeWith(0);

    expect(html).toContain('No tags yet.');
    expect(html).not.toContain('class="rail-more" href');
  });
});

describe('script placement', () => {
  const pages: [string, () => string][] = [
    [
      'tutorials index',
      () =>
        tutorialsIndexPage(
          [subject],
          new Map([
            [subject.id, { total: 1, minutes: 3, difficulties: ['beginner'] }],
          ]),
          new Map([[subject.id, [lesson.id]]]),
          { subjects: 1, tutorials: 1, minutes: 3 },
        ),
    ],
    ['tutorial lesson', () => lessonHtml()],
    [
      'tutorials admin',
      () =>
        tutorialsAdminPage(
          [subject],
          new Map([
            [subject.id, { total: 1, minutes: 3, difficulties: ['beginner'] }],
          ]),
          new Map([[subject.id, 0]]),
        ),
    ],
    ['subject lessons admin', () => subjectLessonsPage(subject, [lesson])],
  ];

  it.each(pages)('%s runs its scripts after the body exists', (_n, render) => {
    const html = render();
    const headEnd = html.indexOf('</head>');

    expect(headEnd).toBeGreaterThan(-1);

    const scripts = [...html.matchAll(/<script>/g)].map((m) => m.index ?? -1);

    expect(scripts.length).toBeGreaterThan(0);

    for (const at of scripts) {
      expect(at).toBeGreaterThan(headEnd);
    }
  });

  it('gives the completion sentinel a measurable height', () => {
    expect(lessonHtml()).toContain('class="lesson-end" data-lesson-end');
    expect(TUTORIALS_STYLES).toContain('.lesson-end { height: 1px;');
  });
});
