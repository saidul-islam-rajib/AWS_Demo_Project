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

  return plain.length <= length ? plain : `${plain.slice(0, length).trimEnd()}…`;
}

/** Split the highlight field into individual takeaways, blank lines dropped. */
export function highlightList(highlight?: string): string[] {
  if (!highlight) return [];

  return highlight
    .split('\n')
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
