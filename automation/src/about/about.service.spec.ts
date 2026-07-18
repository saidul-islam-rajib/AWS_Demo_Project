import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AboutService } from './about.service';
import {
  CAPTION_PREVIEW_LIMIT,
  EMPTY_ABOUT,
  captionPreview,
  isCaptionLong,
  normaliseGalleryItem,
  formatMonth,
  isAboutEmpty,
  isOngoing,
  milestonePeriod,
  normaliseMilestone,
  sortMilestones,
  parseGallery,
  parseLearning,
  parseMilestones,
  parseSkillGroups,
  parseSocials,
} from './about.model';

describe('about.model parsers', () => {
  describe('parseMilestones', () => {
    it('zips parallel form arrays into rows, including dates', () => {
      expect(
        parseMilestones({
          milestoneTitle: ['Software Engineer', 'Junior Developer'],
          milestoneOrg: ['Acme', 'Startup'],
          milestoneDescription: ['Backend work', 'Learned the ropes'],
          milestoneStart: ['2024-01', '2022-01'],
          milestoneEnd: ['', '2024-01'],
        }),
      ).toEqual([
        {
          period: '',
          title: 'Software Engineer',
          org: 'Acme',
          description: 'Backend work',
          startDate: '2024-01',
          endDate: '',
        },
        {
          period: '',
          title: 'Junior Developer',
          org: 'Startup',
          description: 'Learned the ropes',
          startDate: '2022-01',
          endDate: '2024-01',
        },
      ]);
    });

    it('drops rows with no title', () => {
      expect(
        parseMilestones({
          milestoneTitle: ['Real', '  '],
          milestoneOrg: ['A', 'B'],
        }),
      ).toHaveLength(1);
    });

    it('handles a single row arriving as a string', () => {
      expect(parseMilestones({ milestoneTitle: 'Solo' })).toHaveLength(1);
    });

    it('handles an empty form', () => {
      expect(parseMilestones({})).toEqual([]);
    });
  });

  describe('milestone dates', () => {
    const make = (start: string, end = '', title = 't') => ({
      period: '',
      title,
      org: '',
      description: '',
      startDate: start,
      endDate: end,
    });

    it('formats a month', () => {
      expect(formatMonth('2022-10')).toBe('Oct 2022');
      expect(formatMonth('2025-01')).toBe('Jan 2025');
      expect(formatMonth('')).toBe('');
    });

    it('builds the label from the dates', () => {
      expect(milestonePeriod(make('2022-10', '2023-01'))).toBe(
        'Oct 2022 — Jan 2023',
      );
    });

    it('says Present when there is no end date', () => {
      expect(milestonePeriod(make('2025-11'))).toBe('Nov 2025 — Present');
    });

    it('ignores a stored legacy label once dates are set', () => {
      const withLabel = { ...make('2022-10', '2023-01'), period: 'Old label' };

      expect(milestonePeriod(withLabel)).toBe('Oct 2022 — Jan 2023');
    });

    it('detects an ongoing role', () => {
      expect(isOngoing(make('2025-11'))).toBe(true);
      expect(isOngoing(make('2025-11', '2026-01'))).toBe(false);
      expect(isOngoing(make(''))).toBe(false);
    });

    it('orders by end date, most recently finished first', () => {
      const sorted = sortMilestones([
        make('2020-01', '2021-06', 'oldest'),
        make('2022-01', '2024-03', 'newest'),
        make('2021-01', '2022-08', 'middle'),
      ]);

      expect(sorted.map((m) => m.title)).toEqual([
        'newest',
        'middle',
        'oldest',
      ]);
    });

    it('puts an ongoing role above everything finished', () => {
      const sorted = sortMilestones([
        make('2024-01', '2026-01', 'finished recently'),
        make('2025-11', '', 'current'),
      ]);

      expect(sorted[0].title).toBe('current');
    });

    it('breaks a tie on end date using the start date', () => {
      const sorted = sortMilestones([
        make('2020-01', '2024-01', 'started earlier'),
        make('2023-01', '2024-01', 'started later'),
      ]);

      expect(sorted.map((m) => m.title)).toEqual([
        'started later',
        'started earlier',
      ]);
    });

    it('puts entries with no dates at all last', () => {
      const sorted = sortMilestones([
        {
          period: '',
          title: 'undated',
          org: '',
          description: '',
          startDate: '',
          endDate: '',
        },
        make('2020-05', '2021-01', 'dated'),
      ]);

      expect(sorted[0].title).toBe('dated');
    });
  });

  describe('milestones saved before dates existed', () => {
    // about.json written before startDate/endDate were added has neither.
    const legacy = (period: string, title: string) =>
      ({ period, title, org: '', description: '' }) as never;

    it('sorts them without throwing', () => {
      expect(() =>
        sortMilestones([
          legacy('OCT 2022 to Jan 2023', 'Intern'),
          legacy('Jan 2023 to November 2025', 'Junior'),
          legacy('Nov 2025 to Present', 'Senior'),
        ]),
      ).not.toThrow();
    });

    it('still orders them by the year in the period text', () => {
      const sorted = sortMilestones([
        legacy('OCT 2022 to Jan 2023', 'Intern'),
        legacy('Nov 2025 to Present', 'Senior'),
        legacy('Jan 2023 to November 2025', 'Junior'),
      ]);

      expect(sorted.map((m) => m.title)).toEqual([
        'Senior',
        'Junior',
        'Intern',
      ]);
    });

    it('builds a period label without throwing', () => {
      expect(milestonePeriod(legacy('OCT 2022 to Jan 2023', 'Intern'))).toBe(
        'OCT 2022 to Jan 2023',
      );
      expect(milestonePeriod({} as never)).toBe('');
    });

    it('repairs them on read so the rest of the app sees full objects', () => {
      const repaired = normaliseMilestone({ title: 'Intern' });

      expect(repaired).toEqual({
        period: '',
        title: 'Intern',
        org: '',
        description: '',
        startDate: '',
        endDate: '',
      });
    });
  });

  describe('parseSkillGroups', () => {
    it('splits comma separated items', () => {
      expect(
        parseSkillGroups({
          skillGroupName: 'Backend',
          skillGroupItems: 'NestJS, PostgreSQL , Redis',
        }),
      ).toEqual([
        { name: 'Backend', items: ['NestJS', 'PostgreSQL', 'Redis'] },
      ]);
    });

    it('drops a group with a name but no items', () => {
      expect(
        parseSkillGroups({ skillGroupName: 'Empty', skillGroupItems: '  ' }),
      ).toEqual([]);
    });
  });

  describe('parseLearning', () => {
    it('keeps valid statuses', () => {
      expect(
        parseLearning({
          learningTitle: ['Kubernetes', 'Rust'],
          learningNote: ['for work', ''],
          learningStatus: ['learning', 'planned'],
        }),
      ).toEqual([
        { title: 'Kubernetes', note: 'for work', status: 'learning' },
        { title: 'Rust', note: '', status: 'planned' },
      ]);
    });

    it('falls back to learning for an unknown status', () => {
      const rows = parseLearning({
        learningTitle: 'X',
        learningStatus: 'nonsense',
      });

      expect(rows[0].status).toBe('learning');
    });
  });

  describe('parseGallery', () => {
    it('keeps a single image record', () => {
      expect(
        parseGallery({
          galleryUrls: ['/uploads/a.png'],
          galleryCaption: ['At the office'],
        }),
      ).toEqual([{ urls: ['/uploads/a.png'], caption: 'At the office' }]);
    });

    it('keeps several images in one record', () => {
      expect(
        parseGallery({
          galleryUrls: [
            ['/uploads/a.png', '/uploads/b.png', '/uploads/c.png'].join('\n'),
          ],
          galleryCaption: ['A trip'],
        }),
      ).toEqual([
        {
          urls: ['/uploads/a.png', '/uploads/b.png', '/uploads/c.png'],
          caption: 'A trip',
        },
      ]);
    });

    it('keeps records aligned with their captions however many images each holds', () => {
      expect(
        parseGallery({
          galleryUrls: ['/uploads/a.png\n/uploads/b.png', '/uploads/c.png'],
          galleryCaption: ['Two images', 'One image'],
        }),
      ).toEqual([
        { urls: ['/uploads/a.png', '/uploads/b.png'], caption: 'Two images' },
        { urls: ['/uploads/c.png'], caption: 'One image' },
      ]);
    });

    it('drops unsafe urls but keeps the rest of the record', () => {
      expect(
        parseGallery({
          galleryUrls: ['javascript:alert(1)\n/uploads/good.png'],
          galleryCaption: ['Mixed'],
        }),
      ).toEqual([{ urls: ['/uploads/good.png'], caption: 'Mixed' }]);
    });

    it('drops a record with no usable image', () => {
      expect(
        parseGallery({
          galleryUrls: ['javascript:alert(1)'],
          galleryCaption: ['bad'],
        }),
      ).toEqual([]);
    });
  });

  describe('captions', () => {
    const long = 'word '.repeat(40).trim();

    it('leaves a short caption alone', () => {
      expect(captionPreview('Short one')).toBe('Short one');
      expect(isCaptionLong('Short one')).toBe(false);
    });

    it('cuts a long caption on a word boundary', () => {
      const preview = captionPreview(long);

      expect(isCaptionLong(long)).toBe(true);
      expect(preview.length).toBeLessThanOrEqual(CAPTION_PREVIEW_LIMIT + 1);
      expect(preview.endsWith('…')).toBe(true);

      // The real property: the preview is a prefix of the original that ends
      // where a word ends, so no word is cut in half.
      const body = preview.slice(0, -1);
      expect(long.startsWith(body)).toBe(true);
      expect(long.charAt(body.length)).toMatch(/\s|^$/);
    });
  });

  describe('normaliseGalleryItem', () => {
    it('folds a legacy single url into a list', () => {
      expect(
        normaliseGalleryItem({ url: '/uploads/a.png', caption: 'x' }),
      ).toEqual({ urls: ['/uploads/a.png'], caption: 'x' });
    });

    it('leaves a modern record alone', () => {
      expect(
        normaliseGalleryItem({ urls: ['/uploads/a.png'], caption: 'x' }),
      ).toEqual({ urls: ['/uploads/a.png'], caption: 'x' });
    });

    it('handles a record with nothing set', () => {
      expect(normaliseGalleryItem({})).toEqual({ urls: [], caption: '' });
    });
  });

  describe('parseSocials', () => {
    it('needs both a label and a safe url', () => {
      expect(
        parseSocials({
          socialLabel: ['LinkedIn', 'Bad', ''],
          socialUrl: ['https://linkedin.com/in/x', 'javascript:alert(1)', '/x'],
        }),
      ).toEqual([{ label: 'LinkedIn', url: 'https://linkedin.com/in/x' }]);
    });
  });

  describe('isAboutEmpty', () => {
    it('is true for the empty shape', () => {
      expect(isAboutEmpty(EMPTY_ABOUT)).toBe(true);
    });

    it('is false once anything is added', () => {
      expect(isAboutEmpty({ ...EMPTY_ABOUT, intro: 'Hello' })).toBe(false);
      expect(
        isAboutEmpty({
          ...EMPTY_ABOUT,
          gallery: [{ urls: ['/uploads/a.png'], caption: '' }],
        }),
      ).toBe(false);
    });

    it('ignores a headline alone, which is not content', () => {
      expect(isAboutEmpty({ ...EMPTY_ABOUT, headline: 'Hi' })).toBe(true);
    });
  });
});

describe('AboutService', () => {
  let dir: string;
  let service: AboutService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'about-test-'));
    process.env.DATA_DIR = dir;
    service = new AboutService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('starts empty', () => {
    expect(isAboutEmpty(service.get())).toBe(true);
  });

  it('saves and reloads', () => {
    service.save({
      ...EMPTY_ABOUT,
      intro: 'My story',
      milestones: [
        {
          period: '2024',
          title: 'Engineer',
          org: 'Acme',
          description: '',
          startDate: '2024-01',
          endDate: '',
        },
      ],
    });

    const reloaded = new AboutService().get();

    expect(reloaded.intro).toBe('My story');
    expect(reloaded.milestones).toHaveLength(1);
  });

  it('fills in sections missing from an older file', () => {
    service.save({ ...EMPTY_ABOUT, intro: 'Partial' });

    const reloaded = service.get();

    expect(reloaded.gallery).toEqual([]);
    expect(reloaded.socials).toEqual([]);
  });
});
