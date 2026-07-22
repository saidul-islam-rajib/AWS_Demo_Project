import { safeUrl } from '../settings/settings.model';

export interface Milestone {
  period: string;
  title: string;
  org: string;
  description: string;
  startDate: string;
  endDate: string;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(value.trim());
  if (!match) return value.trim();

  const month = Number(match[2]);
  if (month < 1 || month > 12) return match[1];
  return `${MONTHS[month - 1]} ${match[1]}`;
}

export function milestonePeriod(m: Milestone): string {
  const start = (m.startDate ?? '').trim();
  const end = (m.endDate ?? '').trim();

  if (start) {
    return `${formatMonth(start)} — ${end ? formatMonth(end) : 'Present'}`;
  }
  if (end) return formatMonth(end);

  return (m.period ?? '').trim();
}

export function isOngoing(m: Milestone): boolean {
  return Boolean((m.startDate ?? '').trim()) && !(m.endDate ?? '').trim();
}

const ONGOING = '9999-12';

function milestoneKeys(m: Milestone): [string, string] {
  const start = (m.startDate ?? '').trim();
  const end = (m.endDate ?? '').trim();

  if (start || end) {
    return [end || ONGOING, start];
  }

  const year = /\b(19|20)\d{2}\b/.exec(m.period ?? '');
  return year ? [year[0], year[0]] : ['', ''];
}

export function sortMilestones(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => {
    const [endA, startA] = milestoneKeys(a);
    const [endB, startB] = milestoneKeys(b);

    if (!endA && !endB) return 0;
    if (!endA) return 1;
    if (!endB) return -1;

    if (endA !== endB) return endB.localeCompare(endA);
    return startB.localeCompare(startA);
  });
}

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
  urls: string[];
  caption: string;
}

export const CAPTION_PREVIEW_LIMIT = 100;

export function captionPreview(
  caption: string,
  limit = CAPTION_PREVIEW_LIMIT,
): string {
  const text = caption.trim();
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function isCaptionLong(
  caption: string,
  limit = CAPTION_PREVIEW_LIMIT,
): boolean {
  return caption.trim().length > limit;
}

export function normaliseGalleryItem(
  item: Partial<GalleryItem> & { url?: string },
): GalleryItem {
  const urls = Array.isArray(item.urls)
    ? item.urls.filter(Boolean)
    : item.url
      ? [item.url]
      : [];

  return { urls, caption: item.caption ?? '' };
}

export interface SocialLink {
  label: string;
  url: string;
}

export interface AboutContent {
  headline: string;
  intro: string;
  milestones: Milestone[];
  skillGroups: SkillGroup[];
  learning: LearningItem[];
  gallery: GalleryItem[];
  socials: SocialLink[];
}

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

function toArray(value?: string | string[]): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseMilestones(form: {
  milestoneTitle?: string | string[];
  milestoneOrg?: string | string[];
  milestoneDescription?: string | string[];
  milestoneStart?: string | string[];
  milestoneEnd?: string | string[];
}): Milestone[] {
  const titles = toArray(form.milestoneTitle);
  const orgs = toArray(form.milestoneOrg);
  const descriptions = toArray(form.milestoneDescription);
  const starts = toArray(form.milestoneStart);
  const ends = toArray(form.milestoneEnd);

  const rows: Milestone[] = [];

  for (let i = 0; i < titles.length; i++) {
    const title = (titles[i] ?? '').trim();
    if (!title) continue;

    rows.push({
      period: '',
      title,
      org: (orgs[i] ?? '').trim(),
      description: (descriptions[i] ?? '').trim(),
      startDate: (starts[i] ?? '').trim(),
      endDate: (ends[i] ?? '').trim(),
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
  galleryUrls?: string | string[];
  galleryCaption?: string | string[];
}): GalleryItem[] {
  const groups = toArray(form.galleryUrls);
  const captions = toArray(form.galleryCaption);

  const rows: GalleryItem[] = [];

  for (let i = 0; i < groups.length; i++) {
    const urls = (groups[i] ?? '')
      .split('\n')
      .map((u) => safeUrl(u))
      .filter(Boolean)
      .slice(0, 12);

    if (urls.length === 0) continue;

    rows.push({ urls, caption: (captions[i] ?? '').trim() });
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

export function normaliseMilestone(m: Partial<Milestone>): Milestone {
  return {
    period: m.period ?? '',
    title: m.title ?? '',
    org: m.org ?? '',
    description: m.description ?? '',
    startDate: m.startDate ?? '',
    endDate: m.endDate ?? '',
  };
}

export function isAboutEmpty(about: AboutContent): boolean {
  return (
    !about.intro.trim() &&
    about.milestones.length === 0 &&
    about.gallery.length === 0
  );
}
