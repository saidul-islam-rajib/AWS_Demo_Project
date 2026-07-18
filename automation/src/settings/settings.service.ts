import { Injectable, Logger } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import {
  DEFAULT_SETTINGS,
  FooterLink,
  SiteSettings,
  safeUrl,
} from './settings.model';
import { setSettings } from './settings.store';

/** Stored beside posts.json on the data volume, so it survives redeploys. */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  private get dataDir(): string {
    return process.env.DATA_DIR ?? join(process.cwd(), 'data');
  }

  private get file(): string {
    return join(this.dataDir, 'settings.json');
  }

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.dataDir))
        mkdirSync(this.dataDir, { recursive: true });

      if (!existsSync(this.file)) {
        setSettings({ ...DEFAULT_SETTINGS });
        return;
      }

      const stored = JSON.parse(
        readFileSync(this.file, 'utf8'),
      ) as Partial<SiteSettings>;

      // Merge over defaults so a settings file written by an older version
      // does not leave newly added fields undefined.
      setSettings({ ...DEFAULT_SETTINGS, ...stored });
      this.logger.log('Loaded site settings');
    } catch (err) {
      this.logger.error(
        `Could not load settings, using defaults: ${String(err)}`,
      );
      setSettings({ ...DEFAULT_SETTINGS });
    }
  }

  get(): SiteSettings {
    if (!existsSync(this.file)) return { ...DEFAULT_SETTINGS };

    try {
      const stored = JSON.parse(
        readFileSync(this.file, 'utf8'),
      ) as Partial<SiteSettings>;
      return { ...DEFAULT_SETTINGS, ...stored };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  update(
    input: Partial<SiteSettings> & { footerLinks?: FooterLink[] },
  ): SiteSettings {
    const currentValue = this.get();

    const next: SiteSettings = {
      authorName:
        (input.authorName ?? currentValue.authorName).trim() ||
        DEFAULT_SETTINGS.authorName,
      authorRole: (input.authorRole ?? currentValue.authorRole).trim(),
      authorBio: (input.authorBio ?? currentValue.authorBio).trim(),
      avatarUrl: safeUrl(input.avatarUrl ?? currentValue.avatarUrl),

      siteTitle:
        (input.siteTitle ?? currentValue.siteTitle).trim() ||
        DEFAULT_SETTINGS.siteTitle,
      siteTagline: (input.siteTagline ?? currentValue.siteTagline).trim(),
      siteUrl: (
        safeUrl(input.siteUrl ?? currentValue.siteUrl) ||
        DEFAULT_SETTINGS.siteUrl
      ).replace(/\/+$/, ''),
      githubUser: (input.githubUser ?? currentValue.githubUser)
        .trim()
        .replace(/^@/, ''),

      footerOwner: (input.footerOwner ?? currentValue.footerOwner).trim(),
      footerOwnerUrl: safeUrl(
        input.footerOwnerUrl ?? currentValue.footerOwnerUrl,
      ),
      footerSuffix: (input.footerSuffix ?? currentValue.footerSuffix).trim(),
      footerLinks: input.footerLinks ?? currentValue.footerLinks,
    };

    this.persist(next);
    setSettings(next);
    return next;
  }

  private persist(value: SiteSettings): void {
    try {
      if (!existsSync(this.dataDir))
        mkdirSync(this.dataDir, { recursive: true });

      // Temp file then rename, so a crash mid-write cannot truncate the file.
      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save settings: ${String(err)}`);
    }
  }
}
