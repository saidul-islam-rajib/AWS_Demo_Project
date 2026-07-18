import { safeUrl } from '../settings/settings.model';

/** A point on the journey timeline — a job, a course, a project, a move. */
export interface Milestone {
  period: string;
  title: string;
  org: string;
  description: string;
}

/** A named group of skills, e.g. "Backend" -> ["NestJS", "PostgreSQL"]. */
export interface SkillGroup {
  name: string;
  items: string[];
}

export type LearningStatus = 'learning' | 'planned' | 'done';

export interface LearningItem {
  title: string;
  note: string;
  status: LearningStatus;
}

export interface GalleryItem {
  url: string;
  caption: string;
}

export interface SocialLink {
  label: string;
  url: string;
}

export interface AboutContent {
  headline: string;
  /** Markdown. */
  intro: string;
  milestones: Milestone[];
  skillGroups: SkillGroup[];
  learning: LearningItem[];
  gallery: GalleryItem[];
  socials: SocialLink[];
}

/**
 * Starter content for the technical sections only.
 *
 * The skill groups are derived from the languages actually present in the
 * author's public repositories, and the learning items are the technologies
 * this project already uses. Intro, journey, photos and socials stay blank:
 * inventing a biography or employment history would be putting words in the
 * author's mouth, and none of it is knowable from the code.
 *
 * Distinct from the blog's starter posts, which cover pipeline lessons —
 * nothing is repeated between the two.
 */
export const SEED_ABOUT: Pick<AboutContent, 'skillGroups' | 'learning'> = {
  skillGroups: [
    { name: 'Backend', items: ['C#', 'ASP.NET Core', 'NestJS', 'Node.js'] },
    {
      name: 'Languages',
      items: ['TypeScript', 'JavaScript', 'C#', 'Python', 'C++'],
    },
    { name: 'Frontend', items: ['Angular', 'React', 'HTML', 'CSS'] },
    { name: 'Data', items: ['SQL Server', 'MongoDB', 'Entity Framework'] },
    { name: 'DevOps', items: ['Docker', 'Jenkins', 'AWS EC2', 'Git'] },
    {
      name: 'Practices',
      items: ['Clean Architecture', 'Microservices', 'REST APIs', 'CI/CD'],
    },
  ],
  learning: [
    {
      title: 'Kubernetes',
      note: 'The next step after running containers by hand on a single box.',
      status: 'planned',
    },
    {
      title: 'Infrastructure as Code',
      note: 'Terraform, so the EC2 setup is reproducible rather than hand-built.',
      status: 'planned',
    },
    {
      title: 'Jenkins pipelines',
      note: 'Declarative pipelines, build stages and automated deployment.',
      status: 'done',
    },
    {
      title: 'Docker',
      note: 'Image layering, volumes for persistence, and keeping images small.',
      status: 'done',
    },
    {
      title: 'System design',
      note: 'Working through scalability, caching and data modelling trade-offs.',
      status: 'learning',
    },
  ],
};

/**
 * Blank by default. Sections the author must speak for themselves — intro,
 * journey, photos, socials — are never pre-filled.
 */
export const EMPTY_ABOUT: AboutContent = {
  headline: '',
  intro: '',
  milestones: [],
  skillGroups: SEED_ABOUT.skillGroups,
  learning: SEED_ABOUT.learning,
  gallery: [],
  socials: [],
};

export const LEARNING_STATUSES: LearningStatus[] = [
  'learning',
  'planned',
  'done',
];

export const STATUS_LABELS: Record<LearningStatus, string> = {
  learning: 'Learning now',
  planned: 'Planned',
  done: 'Done',
};

/** Form fields arrive as a single string when one row is present, an array otherwise. */
function toArray(value?: string | string[]): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Zip parallel form arrays into rows, dropping any with no meaningful content. */
export function parseMilestones(form: {
  milestonePeriod?: string | string[];
  milestoneTitle?: string | string[];
  milestoneOrg?: string | string[];
  milestoneDescription?: string | string[];
}): Milestone[] {
  const periods = toArray(form.milestonePeriod);
  const titles = toArray(form.milestoneTitle);
  const orgs = toArray(form.milestoneOrg);
  const descriptions = toArray(form.milestoneDescription);

  const rows: Milestone[] = [];

  for (let i = 0; i < titles.length; i++) {
    const title = (titles[i] ?? '').trim();
    if (!title) continue;

    rows.push({
      period: (periods[i] ?? '').trim(),
      title,
      org: (orgs[i] ?? '').trim(),
      description: (descriptions[i] ?? '').trim(),
    });
  }

  return rows.slice(0, 40);
}

export function parseSkillGroups(form: {
  skillGroupName?: string | string[];
  skillGroupItems?: string | string[];
}): SkillGroup[] {
  const names = toArray(form.skillGroupName);
  const items = toArray(form.skillGroupItems);

  const rows: SkillGroup[] = [];

  for (let i = 0; i < names.length; i++) {
    const name = (names[i] ?? '').trim();
    const list = (items[i] ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 30);

    if (!name || list.length === 0) continue;
    rows.push({ name, items: list });
  }

  return rows.slice(0, 12);
}

export function parseLearning(form: {
  learningTitle?: string | string[];
  learningNote?: string | string[];
  learningStatus?: string | string[];
}): LearningItem[] {
  const titles = toArray(form.learningTitle);
  const notes = toArray(form.learningNote);
  const statuses = toArray(form.learningStatus);

  const rows: LearningItem[] = [];

  for (let i = 0; i < titles.length; i++) {
    const title = (titles[i] ?? '').trim();
    if (!title) continue;

    const raw = (statuses[i] ?? 'learning') as LearningStatus;
    const status = LEARNING_STATUSES.includes(raw) ? raw : 'learning';

    rows.push({ title, note: (notes[i] ?? '').trim(), status });
  }

  return rows.slice(0, 40);
}

export function parseGallery(form: {
  galleryUrl?: string | string[];
  galleryCaption?: string | string[];
}): GalleryItem[] {
  const urls = toArray(form.galleryUrl);
  const captions = toArray(form.galleryCaption);

  const rows: GalleryItem[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = safeUrl(urls[i] ?? '');
    if (!url) continue;

    rows.push({ url, caption: (captions[i] ?? '').trim() });
  }

  return rows.slice(0, 60);
}

export function parseSocials(form: {
  socialLabel?: string | string[];
  socialUrl?: string | string[];
}): SocialLink[] {
  const labels = toArray(form.socialLabel);
  const urls = toArray(form.socialUrl);

  const rows: SocialLink[] = [];

  for (let i = 0; i < labels.length; i++) {
    const label = (labels[i] ?? '').trim();
    const url = safeUrl(urls[i] ?? '');
    if (!label || !url) continue;

    rows.push({ label, url });
  }

  return rows.slice(0, 10);
}

/** True when there is nothing to show yet, so the page can prompt instead. */
export function isAboutEmpty(about: AboutContent): boolean {
  // Seeded skills and learning items do not count as the author having
  // written anything, so the prompt still appears until they do.
  return (
    !about.intro.trim() &&
    about.milestones.length === 0 &&
    about.gallery.length === 0
  );
}
