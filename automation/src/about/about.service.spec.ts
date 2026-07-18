import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AboutService } from './about.service';
import {
  EMPTY_ABOUT,
  isAboutEmpty,
  parseGallery,
  parseLearning,
  parseMilestones,
  parseSkillGroups,
  parseSocials,
} from './about.model';

describe('about.model parsers', () => {
  describe('parseMilestones', () => {
    it('zips parallel form arrays into rows', () => {
      expect(
        parseMilestones({
          milestonePeriod: ['2024 — present', '2022 — 2024'],
          milestoneTitle: ['Software Engineer', 'Junior Developer'],
          milestoneOrg: ['Acme', 'Startup'],
          milestoneDescription: ['Backend work', 'Learned the ropes'],
        }),
      ).toEqual([
        {
          period: '2024 — present',
          title: 'Software Engineer',
          org: 'Acme',
          description: 'Backend work',
        },
        {
          period: '2022 — 2024',
          title: 'Junior Developer',
          org: 'Startup',
          description: 'Learned the ropes',
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
    it('keeps uploaded paths and captions', () => {
      expect(
        parseGallery({
          galleryUrl: ['/uploads/a.png'],
          galleryCaption: ['At the office'],
        }),
      ).toEqual([{ url: '/uploads/a.png', caption: 'At the office' }]);
    });

    it('drops entries with an unsafe or empty url', () => {
      expect(
        parseGallery({
          galleryUrl: ['javascript:alert(1)', ''],
          galleryCaption: ['bad', 'also bad'],
        }),
      ).toEqual([]);
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
          gallery: [{ url: '/uploads/a.png', caption: '' }],
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
        { period: '2024', title: 'Engineer', org: 'Acme', description: '' },
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
