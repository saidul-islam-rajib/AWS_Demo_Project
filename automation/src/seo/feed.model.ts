export const FEED_PATH = '/feed.xml';

export const FEED_LIMIT = 20;

export interface FeedPost {
  slug: string;
  title: string;
  subtitle: string;
  highlight: string;
  content: string;
  tags: string[];
  publishedAt: string;
}

export interface FeedOptions {
  base: string;
  title: string;
  description: string;
  authorName: string;
  posts: FeedPost[];
  renderHtml?: (markdown: string) => string;
  now?: Date;
  limit?: number;
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function rfc822(value: string, fallback = new Date(0)): string {
  const parsed = Date.parse(value);
  return (Number.isNaN(parsed) ? fallback : new Date(parsed)).toUTCString();
}

export function excerpt(markdown: string, max = 300): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= max) return text;

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function absolute(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`;
}

export function buildFeed(options: FeedOptions): string {
  const {
    base,
    title,
    description,
    authorName,
    posts,
    renderHtml,
    now = new Date(),
    limit = FEED_LIMIT,
  } = options;

  const root = base.replace(/\/+$/, '');
  const selected = posts.slice(0, limit);

  const newest = selected[0]?.publishedAt;
  const lastBuild = newest ? rfc822(newest, now) : now.toUTCString();

  const items = selected
    .map((post) => {
      const url = absolute(root, `/post/${post.slug}`);
      const summary = post.subtitle || post.highlight || excerpt(post.content);
      const html = renderHtml?.(post.content) ?? '';

      return [
        '    <item>',
        `      <title>${xmlEscape(post.title)}</title>`,
        `      <link>${xmlEscape(url)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
        `      <pubDate>${rfc822(post.publishedAt, now)}</pubDate>`,
        `      <description>${xmlEscape(summary)}</description>`,
        ...post.tags.map(
          (tag) => `      <category>${xmlEscape(tag)}</category>`,
        ),
        html ? `      <content:encoded>${cdata(html)}</content:encoded>` : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xmlEscape(title)}</title>
    <link>${xmlEscape(root)}/</link>
    <description>${xmlEscape(description)}</description>
    <language>en</language>
    <managingEditor>${xmlEscape(authorName)}</managingEditor>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${xmlEscape(absolute(root, FEED_PATH))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
