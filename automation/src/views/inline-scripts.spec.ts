import { Script } from 'vm';
import { aboutAdminPage } from './about.admin.page';
import { aboutPage } from './about.page';
import { dashboardPage, editorPage, loginPage } from './admin.pages';
import { homePage, postPage, tagsPage } from './public.pages';
import { projectEditorPage, projectsAdminPage } from './projects.admin.page';
import { projectDetailPage, projectsPage } from './projects.page';
import { settingsPage } from './settings.page';
import { EMPTY_ABOUT } from '../about/about.model';
import { DEFAULT_SETTINGS } from '../settings/settings.model';
import { Post } from '../posts/post.model';
import { Project } from '../projects/project.model';

/**
 * Every page ships its behaviour as inline script inside a TS template
 * literal, which means an escape can be silently eaten on the way out: `\n`
 * written as '\n' emits a real newline and breaks the string literal, taking
 * the whole script — and every feature on the page — down with it.
 *
 * A page that renders fine can still ship dead JavaScript, so these parse the
 * emitted scripts rather than trusting the source.
 */

const post: Post = {
  id: 'p1',
  slug: 'a-post',
  title: 'A post',
  subtitle: '',
  content: '# Heading\n\nBody text.',
  highlight: '',
  tags: ['docker'],
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
];

function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

describe('inline scripts', () => {
  it.each(pages)('%s emits only parseable JavaScript', (_name, render) => {
    const scripts = inlineScripts(render());

    for (const source of scripts) {
      // Throws on a syntax error, which is exactly what a broken escape causes.
      expect(() => new Script(source)).not.toThrow();
    }
  });

  it('parses the scripts it is meant to guard', () => {
    // Sanity check: the helper must actually be finding scripts.
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
