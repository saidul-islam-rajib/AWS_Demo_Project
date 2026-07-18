import { safeUrl } from '../settings/settings.model';

/** A point on the journey timeline — a job, a course, a project, a move. */
export interface Milestone {
  /**
   * Legacy free-text label. No longer editable — kept so entries written
   * before the date fields existed still render and sort.
   */
  period: string;
  title: string;
  org: string;
  /** Markdown. */
  description: string;
  /** Optional, YYYY-MM. Drives ordering. */
  startDate: string;
  /** Optional, YYYY-MM. Blank means it is still running. */
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

/** "2022-10" -> "Oct 2022". Returns the input unchanged if unparseable. */
export function formatMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(value.trim());
  if (!match) return value.trim();

  const month = Number(match[2]);
  if (month < 1 || month > 12) return match[1];
  return `${MONTHS[month - 1]} ${match[1]}`;
}

/** The label shown on the timeline, built from the dates when none was typed. */
export function milestonePeriod(m: Milestone): string {
  const start = (m.startDate ?? '').trim();
  const end = (m.endDate ?? '').trim();

  // Dates win. The stored label only surfaces for entries that predate them.
  if (start) {
    return `${formatMonth(start)} — ${end ? formatMonth(end) : 'Present'}`;
  }
  if (end) return formatMonth(end);

  return (m.period ?? '').trim();
}

/** No end date with a start date set means the role is current. */
export function isOngoing(m: Milestone): boolean {
  return Boolean((m.startDate ?? '').trim()) && !(m.endDate ?? '').trim();
}

/**
 * Sort keys for a milestone, newest first.
 *
 * End date is primary, so the thing that finished most recently comes first;
 * an ongoing role has no end date and outranks everything finished. Start
 * date breaks ties between roles that ended in the same month.
 *
 * Entries predating the date fields fall back to any year in their free-text
 * period, so they still order sensibly instead of dropping to the bottom.
 */
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

/** Newest first. Undated entries keep their author-defined order, at the end. */
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

/** One gallery record: a caption with one or more images. */
export interface GalleryItem {
  urls: string[];
  caption: string;
}

/** Captions longer than this are cut short, with the rest behind "See more". */
export const CAPTION_PREVIEW_LIMIT = 100;

/** Cuts on a word boundary so the preview never ends mid-word. */
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

/**
 * Records used to hold a single `url`. Anything written before this became a
 * list arrives in that shape, so it is folded into `urls` on read.
 */
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
      // Not editable any more; dates drive the label.
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
  // Each record submits its images as one newline-separated field, which
  // keeps the parallel arrays aligned however many images a record holds.
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

/**
 * Fills in fields that a stored milestone may predate.
 *
 * Adding startDate and endDate to the model did not migrate about.json, so
 * entries written before that change arrive without them.
 */
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
