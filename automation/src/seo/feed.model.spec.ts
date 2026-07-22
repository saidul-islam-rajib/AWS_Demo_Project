import {
  buildFeed,
  excerpt,
  FEED_LIMIT,
  FeedPost,
  rfc822,
  xmlEscape,
} from './feed.model';

function post(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    slug: 'hello-world',
    title: 'Hello World',
    subtitle: 'A first post',
    highlight: '',
    content: 'Some **markdown** body.',
    tags: ['intro'],
    publishedAt: '2026-03-01T10:00:00.000Z',
    ...overrides,
  };
}

function options(posts: FeedPost[] = [post()]) {
  return {
    base: 'https://example.com',
    title: 'The Blog',
    description: 'Writing about things',
    authorName: 'Author Name',
    posts,
    now: new Date('2026-06-01T00:00:00.000Z'),
  };
}

describe('xmlEscape', () => {
  it('escapes the five XML entities', () => {
    expect(xmlEscape(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;');
  });

  it('escapes ampersands before the entities it introduces', () => {
    expect(xmlEscape('a & <b>')).toBe('a &amp; &lt;b&gt;');
  });
});

describe('rfc822', () => {
  it('emits an RFC-822 date, not ISO-8601', () => {
    expect(rfc822('2026-03-01T10:00:00.000Z')).toBe(
      'Sun, 01 Mar 2026 10:00:00 GMT',
    );
  });

  it('falls back rather than emitting "Invalid Date"', () => {
    const fallback = new Date('2026-06-01T00:00:00.000Z');
    expect(rfc822('not a date', fallback)).toBe(fallback.toUTCString());
  });

  it('falls back on an empty value', () => {
    const fallback = new Date('2026-06-01T00:00:00.000Z');
    expect(rfc822('', fallback)).toBe(fallback.toUTCString());
  });
});

describe('excerpt', () => {
  it('strips headings, emphasis and link syntax', () => {
    expect(excerpt('## Title\n\nSome **bold** and [a link](/x).')).toBe(
      'Title Some bold and a link.',
    );
  });

  it('drops fenced code blocks entirely', () => {
    expect(excerpt('Before\n\n```js\nconst x = 1;\n```\n\nAfter')).toBe(
      'Before After',
    );
  });

  it('drops images but keeps surrounding prose', () => {
    expect(excerpt('Look ![alt](/img.png) here')).toBe('Look here');
  });

  it('truncates long text at a word boundary with an ellipsis', () => {
    const result = excerpt('word '.repeat(200), 50);

    expect(result.length).toBeLessThanOrEqual(51);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toContain('wor…');
  });

  it('leaves short text untouched', () => {
    expect(excerpt('Short enough.')).toBe('Short enough.');
  });
});

describe('buildFeed', () => {
  it('declares RSS 2.0 with the namespaces it uses', () => {
    const xml = buildFeed(options());

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain(
      'xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    );
  });

  it('carries the channel metadata', () => {
    const xml = buildFeed(options());

    expect(xml).toContain('<title>The Blog</title>');
    expect(xml).toContain('<link>https://example.com/</link>');
    expect(xml).toContain('<description>Writing about things</description>');
    expect(xml).toContain('<managingEditor>Author Name</managingEditor>');
  });

  it('points the atom self-link at the feed itself', () => {
    expect(buildFeed(options())).toContain(
      '<atom:link href="https://example.com/feed.xml" rel="self" type="application/rss+xml" />',
    );
  });

  it('builds absolute item links from the post slug', () => {
    const xml = buildFeed(options());

    expect(xml).toContain('<link>https://example.com/post/hello-world</link>');
    expect(xml).toContain(
      '<guid isPermaLink="true">https://example.com/post/hello-world</guid>',
    );
  });

  it('does not double the slash when the base URL has a trailing one', () => {
    const xml = buildFeed({ ...options(), base: 'https://example.com/' });

    expect(xml).toContain('<link>https://example.com/post/hello-world</link>');
    expect(xml).not.toContain('example.com//');
  });

  it('emits RFC-822 pubDates', () => {
    expect(buildFeed(options())).toContain(
      '<pubDate>Sun, 01 Mar 2026 10:00:00 GMT</pubDate>',
    );
  });

  it('dates the channel from the newest post, not the current time', () => {
    const xml = buildFeed(options());

    expect(xml).toContain(
      '<lastBuildDate>Sun, 01 Mar 2026 10:00:00 GMT</lastBuildDate>',
    );
  });

  it('falls back to now when there are no posts', () => {
    const xml = buildFeed(options([]));

    expect(xml).toContain(
      '<lastBuildDate>Mon, 01 Jun 2026 00:00:00 GMT</lastBuildDate>',
    );
    expect(xml).not.toContain('<item>');
  });

  it('prefers the subtitle for the description', () => {
    expect(buildFeed(options())).toContain(
      '<description>A first post</description>',
    );
  });

  it('falls back to the highlight, then to an excerpt of the body', () => {
    const withHighlight = buildFeed(
      options([post({ subtitle: '', highlight: 'The highlight' })]),
    );
    expect(withHighlight).toContain('<description>The highlight</description>');

    const withNeither = buildFeed(
      options([
        post({ subtitle: '', highlight: '', content: '# Heading\n\nBody.' }),
      ]),
    );
    expect(withNeither).toContain('<description>Heading Body.</description>');
  });

  it('escapes XML in titles rather than emitting raw markup', () => {
    const xml = buildFeed(options([post({ title: 'A <b>bold</b> & brave' })]));

    expect(xml).toContain(
      '<title>A &lt;b&gt;bold&lt;/b&gt; &amp; brave</title>',
    );
    expect(xml).not.toContain('<b>bold</b>');
  });

  it('emits one category per tag', () => {
    const xml = buildFeed(options([post({ tags: ['nestjs', 'docker'] })]));

    expect(xml).toContain('<category>nestjs</category>');
    expect(xml).toContain('<category>docker</category>');
  });

  it('omits content:encoded when no renderer is supplied', () => {
    expect(buildFeed(options())).not.toContain('<content:encoded>');
  });

  it('wraps rendered HTML in CDATA when a renderer is supplied', () => {
    const xml = buildFeed({
      ...options(),
      renderHtml: () => '<p>Hello</p>',
    });

    expect(xml).toContain('<content:encoded><![CDATA[<p>Hello</p>]]>');
  });

  it('splits a literal ]]> so it cannot terminate the CDATA section early', () => {
    const xml = buildFeed({
      ...options(),
      renderHtml: () => '<p>a ]]> b</p>',
    });

    expect(xml).toContain(']]]]><![CDATA[>');
    expect(xml).not.toContain('<p>a ]]> b</p>');
  });

  it(`includes at most ${FEED_LIMIT} items`, () => {
    const many = Array.from({ length: FEED_LIMIT + 15 }, (_, i) =>
      post({ slug: `post-${i}`, title: `Post ${i}` }),
    );

    const xml = buildFeed(options(many));

    expect(xml.match(/<item>/g)).toHaveLength(FEED_LIMIT);
    expect(xml).toContain('<title>Post 0</title>');
    expect(xml).not.toContain(`<title>Post ${FEED_LIMIT}</title>`);
  });

  it('honours an explicit limit', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      post({ slug: `post-${i}` }),
    );

    const xml = buildFeed({ ...options(many), limit: 3 });

    expect(xml.match(/<item>/g)).toHaveLength(3);
  });

  it('keeps posts in the order given, so newest-first survives', () => {
    const xml = buildFeed(
      options([
        post({ slug: 'newer', title: 'Newer' }),
        post({ slug: 'older', title: 'Older' }),
      ]),
    );

    expect(xml.indexOf('Newer')).toBeLessThan(xml.indexOf('Older'));
  });
});
