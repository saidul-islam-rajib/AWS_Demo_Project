import {
  Chapter,
  applyOrder,
  chaptersOf,
  groupIntoChapters,
  orderedLessons,
  parseOrderIds,
  Tutorial,
  formatDuration,
  lessonsOf,
  moveInSequence,
  neighbours,
  nextOrder,
  normaliseIcon,
  parseDifficulty,
  parseStatus,
  publishedOnly,
  resequence,
  searchTutorials,
  sortByOrder,
  subjectStats,
} from './tutorial.model';

function lesson(overrides: Partial<Tutorial> = {}): Tutorial {
  return {
    id: 't1',
    subjectId: 's1',
    chapterId: '',
    slug: 'a-lesson',
    title: 'A lesson',
    summary: '',
    content: 'word '.repeat(200),
    difficulty: 'beginner',
    order: 1,
    status: 'published',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    views: 0,
    ...overrides,
  };
}

describe('parseDifficulty', () => {
  it('accepts the three known levels', () => {
    expect(parseDifficulty('beginner')).toBe('beginner');
    expect(parseDifficulty('intermediate')).toBe('intermediate');
    expect(parseDifficulty('advanced')).toBe('advanced');
  });

  it('is case and whitespace tolerant', () => {
    expect(parseDifficulty('  Advanced ')).toBe('advanced');
  });

  it('falls back to beginner on anything else', () => {
    expect(parseDifficulty('expert')).toBe('beginner');
    expect(parseDifficulty(undefined)).toBe('beginner');
    expect(parseDifficulty('')).toBe('beginner');
  });
});

describe('parseStatus', () => {
  it('only draft produces a draft', () => {
    expect(parseStatus('draft')).toBe('draft');
    expect(parseStatus('DRAFT')).toBe('draft');
    expect(parseStatus('published')).toBe('published');
    expect(parseStatus('nonsense')).toBe('published');
    expect(parseStatus(undefined)).toBe('published');
  });
});

describe('normaliseIcon', () => {
  it('keeps a single emoji', () => {
    expect(normaliseIcon('🌐')).toBe('🌐');
  });

  it('trims surrounding whitespace', () => {
    expect(normaliseIcon('  🌐  ')).toBe('🌐');
  });

  it('caps longer input so it cannot become a label', () => {
    expect(normaliseIcon('abcdef')).toBe('ab');
  });

  it('counts an emoji as one character rather than two code units', () => {
    expect(normaliseIcon('🌐🔐🧪')).toBe('🌐🔐');
  });

  it('returns empty for empty input', () => {
    expect(normaliseIcon('')).toBe('');
    expect(normaliseIcon(undefined)).toBe('');
  });
});

describe('sortByOrder', () => {
  it('sorts ascending by order', () => {
    const items = [
      { order: 3, title: 'c' },
      { order: 1, title: 'a' },
      { order: 2, title: 'b' },
    ];

    expect(sortByOrder(items).map((i) => i.title)).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties by title so the sort is stable and predictable', () => {
    const items = [
      { order: 1, title: 'zebra' },
      { order: 1, title: 'apple' },
    ];

    expect(sortByOrder(items).map((i) => i.title)).toEqual(['apple', 'zebra']);
  });

  it('does not mutate the input', () => {
    const items = [
      { order: 2, title: 'b' },
      { order: 1, title: 'a' },
    ];
    sortByOrder(items);

    expect(items[0].title).toBe('b');
  });
});

describe('nextOrder', () => {
  it('is one past the highest order', () => {
    expect(nextOrder([{ order: 1 }, { order: 4 }, { order: 2 }])).toBe(5);
  });

  it('starts at 1 for an empty list', () => {
    expect(nextOrder([])).toBe(1);
  });
});

describe('resequence', () => {
  it('renumbers gaps into 1..n', () => {
    const items = [
      { id: 'a', order: 5, title: 'a' },
      { id: 'b', order: 9, title: 'b' },
      { id: 'c', order: 40, title: 'c' },
    ];

    expect(resequence(items).map((i) => i.order)).toEqual([1, 2, 3]);
  });
});

describe('moveInSequence', () => {
  const items = [
    { id: 'a', order: 1, title: 'a' },
    { id: 'b', order: 2, title: 'b' },
    { id: 'c', order: 3, title: 'c' },
  ];

  it('moves an item up', () => {
    expect(moveInSequence(items, 'b', 'up').map((i) => i.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('moves an item down', () => {
    expect(moveInSequence(items, 'b', 'down').map((i) => i.id)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('leaves the first item alone when moved up', () => {
    expect(moveInSequence(items, 'a', 'up').map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('leaves the last item alone when moved down', () => {
    expect(moveInSequence(items, 'c', 'down').map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('ignores an unknown id', () => {
    expect(moveInSequence(items, 'nope', 'up').map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('keeps orders contiguous after a move', () => {
    expect(moveInSequence(items, 'c', 'up').map((i) => i.order)).toEqual([
      1, 2, 3,
    ]);
  });
});

describe('publishedOnly', () => {
  it('drops drafts', () => {
    const items = [lesson({ id: 'a' }), lesson({ id: 'b', status: 'draft' })];

    expect(publishedOnly(items).map((i) => i.id)).toEqual(['a']);
  });
});

describe('lessonsOf', () => {
  const tutorials = [
    lesson({ id: 'a', subjectId: 's1', order: 2 }),
    lesson({ id: 'b', subjectId: 's1', order: 1 }),
    lesson({ id: 'c', subjectId: 's2', order: 1 }),
    lesson({ id: 'd', subjectId: 's1', order: 3, status: 'draft' }),
  ];

  it('returns only the requested subject, in order', () => {
    expect(lessonsOf(tutorials, 's1').map((l) => l.id)).toEqual(['b', 'a']);
  });

  it('hides drafts by default', () => {
    expect(lessonsOf(tutorials, 's1').map((l) => l.id)).not.toContain('d');
  });

  it('includes drafts when asked', () => {
    expect(lessonsOf(tutorials, 's1', true).map((l) => l.id)).toEqual([
      'b',
      'a',
      'd',
    ]);
  });

  it('returns nothing for an unknown subject', () => {
    expect(lessonsOf(tutorials, 'missing')).toEqual([]);
  });
});

describe('subjectStats', () => {
  it('counts published lessons and sums their reading time', () => {
    const tutorials = [
      lesson({ id: 'a', subjectId: 's1' }),
      lesson({ id: 'b', subjectId: 's1' }),
    ];

    const stats = subjectStats(tutorials, 's1');

    expect(stats.total).toBe(2);
    expect(stats.minutes).toBeGreaterThan(0);
  });

  it('excludes drafts from both the count and the time', () => {
    const tutorials = [
      lesson({ id: 'a', subjectId: 's1' }),
      lesson({ id: 'b', subjectId: 's1', status: 'draft' }),
    ];

    expect(subjectStats(tutorials, 's1').total).toBe(1);
  });

  it('lists difficulties present, in ascending order', () => {
    const tutorials = [
      lesson({ id: 'a', subjectId: 's1', difficulty: 'advanced' }),
      lesson({ id: 'b', subjectId: 's1', difficulty: 'beginner' }),
    ];

    expect(subjectStats(tutorials, 's1').difficulties).toEqual([
      'beginner',
      'advanced',
    ]);
  });
});

describe('neighbours', () => {
  const lessons = [
    lesson({ id: 'a', order: 1 }),
    lesson({ id: 'b', order: 2 }),
    lesson({ id: 'c', order: 3 }),
  ];

  it('reports position and total', () => {
    const nav = neighbours(lessons, 'b');

    expect(nav.position).toBe(2);
    expect(nav.total).toBe(3);
  });

  it('gives both sides in the middle', () => {
    const nav = neighbours(lessons, 'b');

    expect(nav.previous?.id).toBe('a');
    expect(nav.next?.id).toBe('c');
  });

  it('has no previous at the start', () => {
    const nav = neighbours(lessons, 'a');

    expect(nav.previous).toBeUndefined();
    expect(nav.next?.id).toBe('b');
  });

  it('has no next at the end', () => {
    const nav = neighbours(lessons, 'c');

    expect(nav.previous?.id).toBe('b');
    expect(nav.next).toBeUndefined();
  });

  it('reports position 0 for an unknown lesson', () => {
    expect(neighbours(lessons, 'nope').position).toBe(0);
  });

  it('handles a single-lesson subject', () => {
    const nav = neighbours([lesson({ id: 'only' })], 'only');

    expect(nav.previous).toBeUndefined();
    expect(nav.next).toBeUndefined();
    expect(nav.position).toBe(1);
    expect(nav.total).toBe(1);
  });
});

describe('formatDuration', () => {
  it('shows minutes under an hour', () => {
    expect(formatDuration(45)).toBe('45 min');
  });

  it('shows whole hours without stray minutes', () => {
    expect(formatDuration(120)).toBe('2 hr');
  });

  it('shows hours and minutes together', () => {
    expect(formatDuration(95)).toBe('1 hr 35 min');
  });

  it('shows a dash for nothing', () => {
    expect(formatDuration(0)).toBe('—');
    expect(formatDuration(-5)).toBe('—');
  });
});

describe('searchTutorials', () => {
  const tutorials = [
    lesson({ id: 'a', title: 'DNS basics', content: 'resolvers' }),
    lesson({ id: 'b', title: 'Subnetting', tags: ['networking'] }),
    lesson({ id: 'c', title: 'Hidden', status: 'draft', content: 'dns' }),
  ];

  it('matches on the title', () => {
    expect(searchTutorials(tutorials, 'dns').map((t) => t.id)).toEqual(['a']);
  });

  it('matches on tags', () => {
    expect(searchTutorials(tutorials, 'networking').map((t) => t.id)).toEqual([
      'b',
    ]);
  });

  it('is case insensitive', () => {
    expect(searchTutorials(tutorials, 'DNS').map((t) => t.id)).toEqual(['a']);
  });

  it('never returns drafts', () => {
    expect(searchTutorials(tutorials, 'dns').map((t) => t.id)).not.toContain(
      'c',
    );
  });

  it('returns nothing for an empty query', () => {
    expect(searchTutorials(tutorials, '   ')).toEqual([]);
  });
});

describe('parseOrderIds', () => {
  it('splits a comma separated list', () => {
    expect(parseOrderIds('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('trims whitespace and drops empties', () => {
    expect(parseOrderIds(' a , ,b,, c ')).toEqual(['a', 'b', 'c']);
  });

  it('returns nothing for missing or empty input', () => {
    expect(parseOrderIds(undefined)).toEqual([]);
    expect(parseOrderIds('')).toEqual([]);
    expect(parseOrderIds('   ')).toEqual([]);
  });
});

describe('applyOrder', () => {
  const items = [
    { id: 'a', order: 1, title: 'A' },
    { id: 'b', order: 2, title: 'B' },
    { id: 'c', order: 3, title: 'C' },
  ];

  it('reorders to the given sequence', () => {
    expect(applyOrder(items, ['c', 'a', 'b']).map((i) => i.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('renumbers order to 1..n', () => {
    expect(applyOrder(items, ['c', 'a', 'b']).map((i) => i.order)).toEqual([
      1, 2, 3,
    ]);
  });

  it('ignores ids that do not exist', () => {
    expect(
      applyOrder(items, ['c', 'ghost', 'a', 'b']).map((i) => i.id),
    ).toEqual(['c', 'a', 'b']);
  });

  it('appends items the list left out, keeping their relative order', () => {
    expect(applyOrder(items, ['c']).map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('leaves the sequence unchanged for an empty list', () => {
    expect(applyOrder(items, []).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('never drops or duplicates an item', () => {
    const result = applyOrder(items, ['b', 'b', 'c']);

    expect(result).toHaveLength(3);
    expect(new Set(result.map((i) => i.id)).size).toBe(3);
  });

  it('does not mutate the input', () => {
    applyOrder(items, ['c', 'b', 'a']);

    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

function chapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'c1',
    subjectId: 's1',
    title: 'A chapter',
    summary: '',
    order: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('chaptersOf', () => {
  it('returns only the requested subject, in order', () => {
    const chapters = [
      chapter({ id: 'b', order: 2, title: 'B' }),
      chapter({ id: 'a', order: 1, title: 'A' }),
      chapter({ id: 'x', subjectId: 's2', title: 'X' }),
    ];

    expect(chaptersOf(chapters, 's1').map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('groupIntoChapters', () => {
  const chapters = [
    chapter({ id: 'c1', order: 1, title: 'One' }),
    chapter({ id: 'c2', order: 2, title: 'Two' }),
  ];

  it('puts each lesson under its chapter', () => {
    const lessons = [
      lesson({ id: 'a', chapterId: 'c1' }),
      lesson({ id: 'b', chapterId: 'c2' }),
    ];

    const groups = groupIntoChapters(chapters, lessons);

    expect(groups).toHaveLength(2);
    expect(groups[0].chapter?.id).toBe('c1');
    expect(groups[0].lessons.map((l) => l.id)).toEqual(['a']);
    expect(groups[1].lessons.map((l) => l.id)).toEqual(['b']);
  });

  it('puts unassigned lessons in a leading group with no chapter', () => {
    const lessons = [
      lesson({ id: 'loose', chapterId: '' }),
      lesson({ id: 'a', chapterId: 'c1' }),
    ];

    const groups = groupIntoChapters(chapters, lessons);

    expect(groups[0].chapter).toBeUndefined();
    expect(groups[0].lessons.map((l) => l.id)).toEqual(['loose']);
  });

  it('treats a lesson pointing at a deleted chapter as unassigned', () => {
    const groups = groupIntoChapters(chapters, [
      lesson({ id: 'orphan', chapterId: 'gone' }),
    ]);

    expect(groups[0].chapter).toBeUndefined();
    expect(groups[0].lessons.map((l) => l.id)).toEqual(['orphan']);
  });

  it('keeps an empty chapter so the admin can still see it', () => {
    const groups = groupIntoChapters(chapters, [
      lesson({ id: 'a', chapterId: 'c1' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[1].lessons).toEqual([]);
  });

  it('omits the loose group entirely when every lesson has a chapter', () => {
    const groups = groupIntoChapters(chapters, [
      lesson({ id: 'a', chapterId: 'c1' }),
    ]);

    expect(groups.every((g) => g.chapter)).toBe(true);
  });
});

describe('orderedLessons', () => {
  const chapters = [
    chapter({ id: 'c1', order: 1, title: 'One' }),
    chapter({ id: 'c2', order: 2, title: 'Two' }),
  ];

  it('reads unassigned first, then chapter by chapter', () => {
    const lessons = [
      lesson({ id: 'second', chapterId: 'c1', order: 1 }),
      lesson({ id: 'third', chapterId: 'c2', order: 1 }),
      lesson({ id: 'first', chapterId: '', order: 1 }),
    ];

    expect(orderedLessons(chapters, lessons, 's1').map((l) => l.id)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('orders lessons within a chapter by their own order', () => {
    const lessons = [
      lesson({ id: 'b', chapterId: 'c1', order: 2 }),
      lesson({ id: 'a', chapterId: 'c1', order: 1 }),
    ];

    expect(orderedLessons(chapters, lessons, 's1').map((l) => l.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('hides drafts unless asked', () => {
    const lessons = [
      lesson({ id: 'live', chapterId: 'c1' }),
      lesson({ id: 'draft', chapterId: 'c1', status: 'draft' }),
    ];

    expect(orderedLessons(chapters, lessons, 's1')).toHaveLength(1);
    expect(orderedLessons(chapters, lessons, 's1', true)).toHaveLength(2);
  });
});
