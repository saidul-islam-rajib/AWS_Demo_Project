import { Script } from 'vm';
import { aboutAdminPage } from './admin/about.page';
import { aboutPage } from './public/about.page';
import { dashboardPage, editorPage, loginPage } from './admin/posts.pages';
import { homePage, postPage, tagsPage } from './public/posts.pages';
import { projectEditorPage, projectsAdminPage } from './admin/projects.page';
import { projectDetailPage, projectsPage } from './public/projects.page';
import { settingsPage } from './admin/settings.page';
import {
  subjectPage,
  tutorialPage,
  tutorialsIndexPage,
} from './public/tutorials.page';
import {
  lessonEditorPage,
  subjectEditorPage,
  subjectLessonsPage,
  tutorialsAdminPage,
} from './admin/tutorials.page';
import { accountDetailPage, accountsAdminPage } from './admin/accounts.page';
import {
  accountPage,
  recoverPage,
  recoveryCodePage,
  resetPage,
} from './public/account.pages';
import { Account } from '../accounts/account.model';
import { EMPTY_ABOUT } from '../about/about.model';
import { DEFAULT_SETTINGS } from '../settings/settings.model';
import { Post } from '../posts/post.model';
import { Project } from '../projects/project.model';
import { Subject, Tutorial } from '../tutorials/tutorial.model';

const post: Post = {
  id: 'p1',
  slug: 'a-post',
  title: 'A post',
  subtitle: '',
  content: '# Heading\n\nBody text.',
  highlight: '',
  tags: ['docker'],
  relatedIds: [],
  status: 'published',
  publishedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  views: 3,
};

const project: Project = {
  id: 'j1',
  slug: 'a-project',
  title: 'A project',
  description: 'Short.',
  detailedDescription: 'Long.',
  showShort: true,
  showDetailed: true,
  coverUrl: '',
  repoUrl: 'https://github.com/a/b',
  demoUrl: '',
  technologies: ['typescript'],
  tags: [],
  keywords: [],
  topics: [],
  year: '2026',
  startDate: '',
  endDate: '',
  status: 'completed',
  featured: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const stats = {
  total: 1,
  published: 1,
  drafts: 0,
  scheduled: 0,
  tags: 1,
  views: 3,
  words: 3,
  readingMinutes: 1,
};

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
  tags: ['networking'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  views: 2,
};

const subjectStat = {
  total: 1,
  minutes: 4,
  difficulties: ['beginner'] as const,
};

const account: Account = {
  id: 'a1',
  name: 'Saidul Islam Rajib',
  email: 'rajib@example.com',
  secret: 'salt:digest',
  recovery: 'salt:digest',
  createdAt: '2026-01-01T00:00:00.000Z',
  recoveryIssuedAt: '2026-01-01T00:00:00.000Z',
};

const pages: [string, () => string][] = [
  [
    'home',
    () =>
      homePage({ posts: [post], tags: [{ tag: 'docker', count: 1 }], stats }),
  ],
  ['post', () => postPage(post, [], '<p>x</p>')],
  [
    'tags',
    () =>
      tagsPage({
        tags: [{ tag: 'docker', count: 1 }],
        featured: [{ tag: 'docker', count: 2, posts: [post] }],
        technologies: [{ term: 'typescript', slug: 'typescript', count: 1 }],
        topics: [],
        keywords: [],
        postCount: 1,
        projectCount: 1,
      }),
  ],
  ['about', () => aboutPage(EMPTY_ABOUT, '<p>x</p>', false, [])],
  ['about (admin view)', () => aboutPage(EMPTY_ABOUT, '<p>x</p>', true, [])],
  ['login', () => loginPage()],
  ['dashboard', () => dashboardPage({ posts: [post], stats, tags: [] })],
  ['post editor (new)', () => editorPage()],
  ['post editor (edit)', () => editorPage(post)],
  ['settings', () => settingsPage(DEFAULT_SETTINGS)],
  ['about admin', () => aboutAdminPage(EMPTY_ABOUT)],
  [
    'projects',
    () =>
      projectsPage({
        groups: [{ year: '2026', projects: [project] }],
        total: 1,
        years: ['2026'],
        techs: [{ term: 'typescript', slug: 'typescript', count: 1 }],
        query: '',
        activeYear: '',
        activeTech: '',
      }),
  ],
  ['project detail', () => projectDetailPage(project, [], '<p>x</p>')],
  [
    'projects admin',
    () => projectsAdminPage({ projects: [project], githubUser: 'x' }),
  ],
  ['project editor (new)', () => projectEditorPage()],
  ['project editor (edit)', () => projectEditorPage(project)],
  [
    'tutorials index',
    () =>
      tutorialsIndexPage(
        [subject],
        new Map([[subject.id, { ...subjectStat, difficulties: ['beginner'] }]]),
        new Map([[subject.id, [lesson.id]]]),
        { subjects: 1, tutorials: 1, minutes: 4 },
      ),
  ],
  [
    'tutorial subject',
    () =>
      subjectPage(subject, [{ lessons: [lesson] }], {
        ...subjectStat,
        difficulties: ['beginner'],
      }),
  ],
  [
    'tutorial lesson',
    () =>
      tutorialPage(
        subject,
        lesson,
        [{ lessons: [lesson] }],
        { position: 1, total: 1 },
        '<p>x</p>',
      ),
  ],
  [
    'tutorials admin',
    () =>
      tutorialsAdminPage(
        [subject],
        new Map([[subject.id, { ...subjectStat, difficulties: ['beginner'] }]]),
        new Map([[subject.id, 0]]),
      ),
  ],
  ['subject editor (new)', () => subjectEditorPage()],
  ['subject editor (edit)', () => subjectEditorPage(subject)],
  [
    'subject lessons',
    () => subjectLessonsPage(subject, [{ lessons: [lesson] }]),
  ],
  ['lesson editor (new)', () => lessonEditorPage([subject], subject)],
  ['lesson editor (edit)', () => lessonEditorPage([subject], subject, lesson)],
  [
    'account home',
    () =>
      accountPage({
        account,
        certificates: [],
        recoveryIssuedAt: account.recoveryIssuedAt,
      }),
  ],
  ['account recovery code', () => recoveryCodePage('ABCDEFGHJKLMNPQRSTUV')],
  ['account recover', () => recoverPage()],
  ['account reset', () => resetPage({ code: 'ABCDEFGHJKLMNPQRSTUV' })],
  [
    'accounts admin',
    () =>
      accountsAdminPage({
        rows: [{ account, certificates: 1, liveReset: true }],
      }),
  ],
  [
    'account detail (admin)',
    () =>
      accountDetailPage({
        account,
        certificates: 1,
        history: [],
        issued: {
          code: 'ABCDEFGHJKLMNPQRSTUV',
          url: 'https://example.test/account/reset?code=ABCDE-FGHJK-LMNPQ-RSTUV',
        },
      }),
  ],
];

function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

describe('inline scripts', () => {
  it.each(pages)('%s emits only parseable JavaScript', (_name, render) => {
    const scripts = inlineScripts(render());

    for (const source of scripts) {
      expect(() => new Script(source)).not.toThrow();
    }
  });

  it.each(pages)(
    '%s has no literal escape sequence in its head',
    (_name, render) => {
      const html = render();
      const head = html.slice(0, html.indexOf('</head>'));
      const betweenTags = head.replace(/<style>[\s\S]*?<\/style>/g, '');

      expect(betweenTags).not.toContain('\\n');
      expect(betweenTags).not.toContain('\\t');
    },
  );

  it('parses the scripts it is meant to guard', () => {
    expect(inlineScripts(aboutAdminPage(EMPTY_ABOUT)).length).toBeGreaterThan(
      0,
    );
    expect(inlineScripts(editorPage()).length).toBeGreaterThan(0);
  });

  it('fails on a deliberately broken script, proving the guard works', () => {
    const broken = "<script>var a = 'oops\nmore';</script>";
    const [source] = inlineScripts(broken);

    expect(() => new Script(source)).toThrow();
  });
});
