import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { SettingsService } from './settings.service';
import { getSettings } from './settings.store';
import {
  DEFAULT_SETTINGS,
  initials,
  parseFooterLinks,
  safeUrl,
} from './settings.model';

describe('settings.model', () => {
  describe('initials', () => {
    it('takes first and last initials', () => {
      expect(initials('Saidul Islam Rajib')).toBe('SR');
      expect(initials('Ada Lovelace')).toBe('AL');
    });

    it('takes two letters from a single name', () => {
      expect(initials('Prince')).toBe('PR');
    });

    it('handles empty input', () => {
      expect(initials('')).toBe('?');
      expect(initials('   ')).toBe('?');
    });
  });

  describe('safeUrl', () => {
    it('allows http, https and site-relative paths', () => {
      expect(safeUrl('https://example.com')).toBe('https://example.com');
      expect(safeUrl('http://example.com')).toBe('http://example.com');
      expect(safeUrl('/tags')).toBe('/tags');
    });

    it('rejects javascript and data URLs', () => {
      expect(safeUrl('javascript:alert(1)')).toBe('');
      expect(safeUrl('data:text/html,<script>')).toBe('');
      expect(safeUrl('  JavaScript:alert(1)')).toBe('');
    });

    it('rejects a bare hostname, which would resolve relative', () => {
      expect(safeUrl('example.com')).toBe('');
    });

    it('handles empty input', () => {
      expect(safeUrl('')).toBe('');
    });
  });

  describe('parseFooterLinks', () => {
    it('pairs labels with urls', () => {
      expect(
        parseFooterLinks(['Blog', 'GitHub'], ['/', 'https://github.com']),
      ).toEqual([
        { label: 'Blog', url: '/' },
        { label: 'GitHub', url: 'https://github.com' },
      ]);
    });

    it('drops rows missing a label or a url', () => {
      expect(
        parseFooterLinks(['Blog', '', 'X'], ['/', 'https://a.com', '']),
      ).toEqual([{ label: 'Blog', url: '/' }]);
    });

    it('drops rows with an unsafe url', () => {
      expect(parseFooterLinks(['Evil'], ['javascript:alert(1)'])).toEqual([]);
    });

    it('accepts a single pair arriving as strings', () => {
      expect(parseFooterLinks('Blog', '/')).toEqual([
        { label: 'Blog', url: '/' },
      ]);
    });

    it('caps at 6 links', () => {
      const labels = Array.from({ length: 10 }, (_, i) => `L${i}`);
      const urls = Array.from({ length: 10 }, () => '/');

      expect(parseFooterLinks(labels, urls)).toHaveLength(6);
    });

    it('handles nothing supplied', () => {
      expect(parseFooterLinks(undefined, undefined)).toEqual([]);
    });
  });
});

describe('SettingsService', () => {
  let dir: string;
  let service: SettingsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'settings-test-'));
    process.env.DATA_DIR = dir;
    service = new SettingsService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('starts from the defaults', () => {
    expect(service.get().authorName).toBe(DEFAULT_SETTINGS.authorName);
  });

  it('saves and reloads changes', () => {
    service.update({ authorName: 'New Name', authorRole: 'Backend Engineer' });

    expect(new SettingsService().get().authorName).toBe('New Name');
  });

  it('updates the store the views read from', () => {
    service.update({ authorName: 'Store Name' });

    expect(getSettings().authorName).toBe('Store Name');
  });

  it('keeps fields that were not submitted', () => {
    service.update({ authorName: 'Only Name' });

    expect(service.get().footerOwner).toBe(DEFAULT_SETTINGS.footerOwner);
  });

  it('falls back to the default when a required field is blanked', () => {
    service.update({ authorName: '   ' });

    expect(service.get().authorName).toBe(DEFAULT_SETTINGS.authorName);
  });

  it('strips an unsafe owner url', () => {
    service.update({ footerOwnerUrl: 'javascript:alert(1)' });

    expect(service.get().footerOwnerUrl).toBe('');
  });

  it('stores footer links', () => {
    service.update({
      footerLinks: [{ label: 'GitHub', url: 'https://github.com' }],
    });

    expect(service.get().footerLinks).toEqual([
      { label: 'GitHub', url: 'https://github.com' },
    ]);
  });

  it('fills in fields missing from an older settings file', () => {
    service.update({ authorName: 'Partial' });
    const reloaded = new SettingsService().get();

    expect(reloaded.siteTitle).toBe(DEFAULT_SETTINGS.siteTitle);
    expect(reloaded.footerLinks.length).toBeGreaterThan(0);
  });
});
