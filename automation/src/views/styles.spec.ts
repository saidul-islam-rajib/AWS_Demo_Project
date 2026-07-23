import { readFileSync } from 'fs';
import { join } from 'path';
import { TUTORIALS_STYLES } from './public/tutorials.styles';
import { TUTORIALS_ADMIN_STYLES } from './admin/tutorials.styles';
import {
  ACCOUNT_ADMIN_CSS,
  ACCOUNT_PUBLIC_CSS,
} from '../accounts/account.assets';
import { UI_COMPONENTS_CSS } from '../shared/view/ui.assets';
import {
  subjectPage,
  tutorialPage,
  tutorialsIndexPage,
} from './public/tutorials.page';
import { homePage } from './public/posts.pages';
import { ContentPolicy } from '../shared/config/policies';

const SIDEBAR_TAG_LIMIT = ContentPolicy.sidebarTagLimit;
import {
  lessonEditorPage,
  subjectEditorPage,
  subjectLessonsPage,
  tutorialsAdminPage,
} from './admin/tutorials.page';
import { CONDITIONAL_FIELDS_SCRIPT } from './shared/scripts/conditional-fields';
import { PROGRESS_TRACKER_SCRIPT } from './shared/scripts/progress-tracker';
import {
  Difficulty,
  ENROLMENT_POLICIES,
  Subject,
  Tutorial,
} from '../tutorials/tutorial.model';

const subject: Subject = {
  id: 's1',
  slug: 'networking',
  title: 'Networking',
  summary: 'How machines find each other.',
  icon: '🌐',
  order: 1,
  status: 'published',
  enrolment: 'open',
  enrolKey: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const lesson: Tutorial = {
  id: 't1',
  subjectId: 's1',
  chapterId: '',
  completionSeconds: 30,
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
    [{ lessons: [lesson] }],
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

const bundles: [string, string][] = [
  ['ui components', UI_COMPONENTS_CSS],
  ['public accounts', ACCOUNT_PUBLIC_CSS],
  ['admin accounts', ACCOUNT_ADMIN_CSS],
];

const allCss: [string, string][] = [...sheets, ...bundles];

describe('stylesheet integrity', () => {
  it('finds the custom properties the layout defines', () => {
    expect(DEFINED.has('--ink')).toBe(true);
    expect(DEFINED.has('--accent')).toBe(true);
    expect(DEFINED.size).toBeGreaterThan(10);
  });

  it.each(allCss)('%s references only defined custom properties', (_n, css) => {
    const used = [...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
    const unknown = [...new Set(used)].filter((name) => !DEFINED.has(name));

    expect(unknown).toEqual([]);
  });

  it.each(allCss)('%s has balanced braces', (_n, css) => {
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
    expect(lessonHtml()).toContain('aria-hidden="true"');
  });

  it('keeps a manual toggle so a wrong guess can be undone', () => {
    const html = lessonHtml();

    expect(html).toContain('data-mark-done="t1"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('does not explain the completion mechanism to the reader', () => {
    const html = lessonHtml();

    expect(html).not.toContain('Marked complete after');
    expect(html).not.toContain('data-auto-note');
    expect(html).toContain('Mark as complete');
  });

  it('observes the sentinel and marks after a dwell', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('[data-lesson-end]');
    expect(PROGRESS_TRACKER_SCRIPT).toContain('IntersectionObserver');
  });

  it('takes the dwell from the lesson rather than a fixed constant', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain("getAttribute('data-dwell')");
    expect(lessonHtml()).toContain('data-dwell="30"');
  });

  it('falls back to 30 seconds when the lesson gives no dwell', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('seconds <= 0 ? 30 : seconds');
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
    [
      'subject lessons admin',
      () => subjectLessonsPage(subject, [{ lessons: [lesson] }]),
    ],
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

describe('student course overview', () => {
  const subjectHtml = (locked = false): string =>
    subjectPage(
      subject,
      [{ chapter: undefined, lessons: [lesson] }],
      { total: 1, minutes: 3, difficulties: ['beginner'] },
      { locked },
    );

  it('offers a resume link carrying the lesson ids and urls', () => {
    const html = subjectHtml();

    expect(html).toContain('data-resume="t1"');
    expect(html).toContain('data-resume-urls="/tutorials/networking/');
    expect(html).toContain('Start the course');
  });

  it('picks the first unread lesson', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('if (!isDone(ids[i]))');
    expect(PROGRESS_TRACKER_SCRIPT).toContain('Continue where you left off');
  });

  it('offers a restart once every lesson is done', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('Read again from the start');
  });

  it('counts progress per chapter', () => {
    expect(PROGRESS_TRACKER_SCRIPT).toContain('[data-chapter-of]');
    expect(PROGRESS_TRACKER_SCRIPT).toContain("classList.toggle('complete'");
  });

  it('hides progress and resume behind an enrolment key', () => {
    const html = subjectHtml(true);

    expect(html).toContain('Enrolment key needed');
    expect(html).not.toContain('data-resume=');
    expect(html).not.toContain('data-progress-for=');
  });
});

describe('completion time field', () => {
  const editor = (seconds?: number): string =>
    lessonEditorPage(
      [subject],
      subject,
      seconds === undefined
        ? undefined
        : { ...lesson, completionSeconds: seconds },
    );

  it('labels the value with its unit rather than in the label text', () => {
    const html = editor();

    expect(html).toContain('Counts as read after');
    expect(html).toContain('<span class="unit">seconds</span>');
  });

  it('restates the number in plain terms', () => {
    expect(editor(30)).toContain('about 30 seconds of reading');
    expect(editor(600)).toContain('about 10 minutes of reading');
    expect(editor(60)).toContain('about 1 minute of reading');
  });

  it('offers common values without forcing them', () => {
    const html = editor();

    expect(html).toContain('list="dwell-presets"');
    expect(html).toContain('<option value="300">');
    expect(html).toContain('type="number"');
  });

  it('defaults a new lesson to thirty seconds', () => {
    expect(editor()).toContain('value="30"');
  });
});

describe('enrolment policy field', () => {
  const editor = (s?: Subject): string => subjectEditorPage(s);

  it('renders one option per policy, from the policy list', () => {
    const html = editor();

    for (const policy of ENROLMENT_POLICIES) {
      expect(html).toContain(`value="${policy.value}"`);
      expect(html).toContain(policy.label);
    }
  });

  it('carries what each option reveals as data, not as a hardcoded check', () => {
    const html = editor();

    for (const policy of ENROLMENT_POLICIES) {
      expect(html).toContain(
        `value="${policy.value}" data-reveals="${policy.reveals}"`,
      );
    }
  });

  it('hides the key field for a policy that does not need one', () => {
    expect(editor()).toContain('id="enrol-key-field" hidden');
  });

  it('shows the key field for a policy that needs one', () => {
    const html = editor({ ...subject, enrolment: 'key', enrolKey: 'autumn' });

    expect(html).toContain('id="enrol-key-field" ');
    expect(html).not.toContain('id="enrol-key-field" hidden');
  });

  it('shows the hint belonging to the selected policy', () => {
    expect(editor()).toContain(ENROLMENT_POLICIES[0].hint);
    expect(editor({ ...subject, enrolment: 'key' })).toContain(
      ENROLMENT_POLICIES[1].hint,
    );
  });

  it('toggles purely from the data attributes', () => {
    expect(CONDITIONAL_FIELDS_SCRIPT).toContain("getAttribute('data-reveals')");
    expect(CONDITIONAL_FIELDS_SCRIPT).not.toContain("'key'");
    expect(CONDITIONAL_FIELDS_SCRIPT).not.toContain('enrol');
  });
});
