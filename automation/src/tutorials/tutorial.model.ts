import { readingMinutes, slugify } from '../posts/post.model';

export type TutorialStatus = 'draft' | 'published';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export const DIFFICULTIES: Difficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export type Enrolment = 'open' | 'key';

export const ENROLMENT_LABELS: Record<Enrolment, string> = {
  open: 'Open to everyone',
  key: 'Needs an enrolment key',
};

export interface Subject {
  id: string;
  slug: string;
  title: string;
  summary: string;
  icon: string;
  order: number;
  status: TutorialStatus;
  enrolment: Enrolment;
  enrolKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  summary: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tutorial {
  id: string;
  subjectId: string;
  chapterId: string;
  completionSeconds: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  difficulty: Difficulty;
  order: number;
  status: TutorialStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  views: number;
}

export interface TutorialStore {
  subjects: Subject[];
  chapters: Chapter[];
  tutorials: Tutorial[];
}

export interface ChapterInput {
  subjectId: string;
  title: string;
  summary?: string;
}

export interface ChapterGroup {
  chapter?: Chapter;
  lessons: Tutorial[];
}

export interface SubjectInput {
  title: string;
  summary?: string;
  icon?: string;
  status?: TutorialStatus;
  enrolment?: string;
  enrolKey?: string;
}

export interface TutorialInput {
  subjectId: string;
  chapterId?: string;
  completionSeconds?: string | number;
  title: string;
  summary?: string;
  content: string;
  difficulty?: string;
  status?: TutorialStatus;
  tags?: string | string[];
}

export interface SubjectStats {
  total: number;
  minutes: number;
  difficulties: Difficulty[];
}

export interface Neighbours {
  previous?: Tutorial;
  next?: Tutorial;
  position: number;
  total: number;
}

export { slugify };

export function parseDifficulty(value?: string): Difficulty {
  const candidate = (value ?? '').trim().toLowerCase();
  return DIFFICULTIES.includes(candidate as Difficulty)
    ? (candidate as Difficulty)
    : 'beginner';
}

export function parseStatus(value?: string): TutorialStatus {
  return (value ?? '').trim().toLowerCase() === 'draft' ? 'draft' : 'published';
}

export const DEFAULT_COMPLETION_SECONDS = 30;

export const MAX_COMPLETION_SECONDS = 3600;

export function parseCompletionSeconds(value?: string | number): number {
  const raw =
    typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_COMPLETION_SECONDS;

  return Math.min(Math.round(raw), MAX_COMPLETION_SECONDS);
}

export function suggestedCompletionSeconds(content: string): number {
  return Math.min(
    MAX_COMPLETION_SECONDS,
    Math.max(DEFAULT_COMPLETION_SECONDS, readingMinutes(content) * 60),
  );
}

export function parseEnrolment(value?: string): Enrolment {
  return (value ?? '').trim().toLowerCase() === 'key' ? 'key' : 'open';
}

export function normaliseEnrolKey(value?: string): string {
  return (value ?? '').trim().slice(0, 64);
}

export function requiresEnrolment(subject: {
  enrolment: Enrolment;
  enrolKey: string;
}): boolean {
  return subject.enrolment === 'key' && subject.enrolKey.length > 0;
}

export function normaliseIcon(value?: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  return [...trimmed].slice(0, 2).join('');
}

export function sortByOrder<T extends { order: number; title: string }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title),
  );
}

export function nextOrder(items: { order: number }[]): number {
  return items.reduce((highest, item) => Math.max(highest, item.order), 0) + 1;
}

export function resequence<T extends { order: number; title: string }>(
  items: T[],
): T[] {
  return sortByOrder(items).map((item, index) => ({
    ...item,
    order: index + 1,
  }));
}

export function moveInSequence<
  T extends { id: string; order: number; title: string },
>(items: T[], id: string, direction: 'up' | 'down'): T[] {
  const ordered = resequence(items);
  const index = ordered.findIndex((item) => item.id === id);
  if (index === -1) return ordered;

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return ordered;

  const swapped = [...ordered];
  const a = swapped[index];
  const b = swapped[target];
  swapped[index] = { ...b, order: a.order };
  swapped[target] = { ...a, order: b.order };

  return sortByOrder(swapped);
}

export function applyOrder<
  T extends { id: string; order: number; title: string },
>(items: T[], ids: string[]): T[] {
  const remaining = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];

  for (const id of ids) {
    const item = remaining.get(id);
    if (item) {
      ordered.push(item);
      remaining.delete(id);
    }
  }

  for (const leftover of sortByOrder([...remaining.values()])) {
    ordered.push(leftover);
  }

  return ordered.map((item, index) => ({ ...item, order: index + 1 }));
}

export function parseOrderIds(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function publishedOnly<T extends { status: TutorialStatus }>(
  items: T[],
): T[] {
  return items.filter((item) => item.status === 'published');
}

export function lessonsOf(
  tutorials: Tutorial[],
  subjectId: string,
  includeDrafts = false,
): Tutorial[] {
  const scoped = tutorials.filter((t) => t.subjectId === subjectId);
  return sortByOrder(includeDrafts ? scoped : publishedOnly(scoped));
}

export function chaptersOf(chapters: Chapter[], subjectId: string): Chapter[] {
  return sortByOrder(chapters.filter((c) => c.subjectId === subjectId));
}

export function groupIntoChapters(
  chapters: Chapter[],
  lessons: Tutorial[],
): ChapterGroup[] {
  const known = new Set(chapters.map((c) => c.id));

  const loose = lessons.filter(
    (lesson) => !lesson.chapterId || !known.has(lesson.chapterId),
  );

  const groups: ChapterGroup[] = chapters.map((chapter) => ({
    chapter,
    lessons: lessons.filter((lesson) => lesson.chapterId === chapter.id),
  }));

  return loose.length ? [{ lessons: loose }, ...groups] : groups;
}

export function flattenChapters(groups: ChapterGroup[]): Tutorial[] {
  return groups.flatMap((group) => group.lessons);
}

export function orderedLessons(
  chapters: Chapter[],
  tutorials: Tutorial[],
  subjectId: string,
  includeDrafts = false,
): Tutorial[] {
  return flattenChapters(
    groupIntoChapters(
      chaptersOf(chapters, subjectId),
      lessonsOf(tutorials, subjectId, includeDrafts),
    ),
  );
}

export function subjectStats(
  tutorials: Tutorial[],
  subjectId: string,
): SubjectStats {
  const lessons = lessonsOf(tutorials, subjectId);
  const difficulties = DIFFICULTIES.filter((level) =>
    lessons.some((lesson) => lesson.difficulty === level),
  );

  return {
    total: lessons.length,
    minutes: lessons.reduce(
      (sum, lesson) => sum + readingMinutes(lesson.content),
      0,
    ),
    difficulties,
  };
}

export function neighbours(lessons: Tutorial[], currentId: string): Neighbours {
  const ordered = lessons;
  const index = ordered.findIndex((lesson) => lesson.id === currentId);

  if (index === -1) {
    return { position: 0, total: ordered.length };
  }

  return {
    previous: index > 0 ? ordered[index - 1] : undefined,
    next: index < ordered.length - 1 ? ordered[index + 1] : undefined,
    position: index + 1,
    total: ordered.length,
  };
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function searchTutorials(
  tutorials: Tutorial[],
  query: string,
): Tutorial[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return publishedOnly(tutorials).filter((tutorial) =>
    [
      tutorial.title,
      tutorial.summary,
      tutorial.content,
      tutorial.tags.join(' '),
    ]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}
