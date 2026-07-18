export interface FooterLink {
  label: string;
  url: string;
}

export interface SiteSettings {
  /** Profile */
  authorName: string;
  authorRole: string;
  authorBio: string;
  /** Path to an uploaded image, or empty to fall back to initials. */
  avatarUrl: string;

  /** Site */
  siteTitle: string;
  siteTagline: string;
  /** Absolute base URL. Open Graph requires absolute image and page URLs. */
  siteUrl: string;
  /** GitHub username, used to import projects. */
  githubUser: string;
  /** Show the heading and tagline block at the top of the home page. */
  showIntro: boolean;

  /** Footer */
  footerOwner: string;
  footerOwnerUrl: string;
  footerSuffix: string;
  footerLinks: FooterLink[];
}

export const DEFAULT_SETTINGS: SiteSettings = {
  authorName: 'Saidul Islam Rajib',
  authorRole: 'Software Engineer',
  authorBio: '',
  avatarUrl: '',

  siteTitle: 'Engineering notes',
  siteTagline:
    'Backend development, DevOps and cloud infrastructure — written up as I work through them.',
  siteUrl: 'http://16.171.254.209:3000',
  githubUser: '',
  showIntro: true,

  footerOwner: 'Team Sober',
  footerOwnerUrl: 'https://portfolio-rajib.vercel.app/',
  footerSuffix: 'All rights reserved.',
  footerLinks: [
    { label: 'Blog', url: '/' },
    { label: 'Portfolio', url: 'https://portfolio-rajib.vercel.app/' },
  ],
};

/** Initials for the avatar fallback, e.g. "Saidul Islam Rajib" -> "SR". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Only http(s) and site-relative links are allowed, so a settings value can
 * never introduce a javascript: URL into every rendered page.
 */
export function safeUrl(url: string): string {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '';
}

/** Footer links arrive as parallel arrays from the form. */
export function parseFooterLinks(
  labels?: string | string[],
  urls?: string | string[],
): FooterLink[] {
  const labelList = Array.isArray(labels) ? labels : labels ? [labels] : [];
  const urlList = Array.isArray(urls) ? urls : urls ? [urls] : [];

  const links: FooterLink[] = [];

  for (let i = 0; i < labelList.length; i++) {
    const label = (labelList[i] ?? '').trim();
    const url = safeUrl(urlList[i] ?? '');
    if (label && url) links.push({ label, url });
  }

  return links.slice(0, 6);
}
