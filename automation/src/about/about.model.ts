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
 * Deliberately empty. The page is built from what the author adds in admin,
 * not from placeholder content pretending to be theirs.
 */
export const EMPTY_ABOUT: AboutContent = {
  headline: '',
  intro: '',
  milestones: [],
  skillGroups: [],
  learning: [],
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
  return (
    !about.intro.trim() &&
    about.milestones.length === 0 &&
    about.skillGroups.length === 0 &&
    about.learning.length === 0 &&
    about.gallery.length === 0
  );
}
