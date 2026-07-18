export type PostStatus = 'draft' | 'published';

export interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  /** Markdown body. */
  content: string;
  /**
   * Key takeaways, one per line. A single line renders as a pull quote;
   * several render as a takeaways list. Stored as one string so posts
   * written before this was a list still load unchanged.
   */
  highlight: string;
  tags: string[];
  status: PostStatus;
  /**
   * When the post goes live. Distinct from createdAt so a post can be
   * backdated, or scheduled to appear at a future time.
   */
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  views: number;
}

export interface PostInput {
  title: string;
  subtitle?: string;
  content: string;
  highlight?: string;
  tags?: string | string[];
  status?: PostStatus;
  publishedAt?: string;
}

/** A published post whose publish time has not arrived yet. */
export function isScheduled(post: Post): boolean {
  return (
    post.status === 'published' && Date.parse(post.publishedAt) > Date.now()
  );
}

/**
 * Accepts the datetime-local format the editor submits, falling back to now
 * when the field is blank or unparseable.
 */
export function parsePublishedAt(value?: string, fallback?: string): string {
  const raw = (value ?? '').trim();
  if (!raw) return fallback ?? new Date().toISOString();

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed)
    ? new Date(parsed).toISOString()
    : (fallback ?? new Date().toISOString());
}

/** ISO instant -> the value a datetime-local input expects. */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** URL-safe slug. Falls back to a timestamp when a title has no usable characters. */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || `post-${Date.now()}`;
}

/** Tags accepted as a comma-separated string (from the form) or an array. */
export function normaliseTags(tags?: string | string[]): string[] {
  if (!tags) return [];

  const list = Array.isArray(tags) ? tags : tags.split(',');

  return [
    ...new Set(
      list
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
        .slice(0, 8),
    ),
  ];
}

/** 200 words per minute, rounded up, minimum 1. */
export function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Plain-text preview with markdown syntax stripped. */
export function excerpt(content: string, length = 180): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return plain.length <= length
    ? plain
    : `${plain.slice(0, length).trimEnd()}…`;
}

/** Split the highlight field into individual takeaways, blank lines dropped. */
export function highlightList(highlight?: string): string[] {
  if (!highlight) return [];

  return highlight
    .split('\n')
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

/** "today", "3 days ago", "2 months ago" — friendlier than a date for recency. */
export function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000);

  if (!Number.isFinite(days)) return '—';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export function wordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
