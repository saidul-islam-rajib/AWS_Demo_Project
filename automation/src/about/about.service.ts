import { Injectable, Logger } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { AboutContent, EMPTY_ABOUT, normaliseMilestone } from './about.model';

/** Stored beside posts.json and settings.json on the data volume. */
@Injectable()
export class AboutService {
  private readonly logger = new Logger(AboutService.name);

  private get dataDir(): string {
    return process.env.DATA_DIR ?? join(process.cwd(), 'data');
  }

  private get file(): string {
    return join(this.dataDir, 'about.json');
  }

  get(): AboutContent {
    if (!existsSync(this.file)) return { ...EMPTY_ABOUT };

    try {
      const stored = JSON.parse(
        readFileSync(this.file, 'utf8'),
      ) as Partial<AboutContent>;

      // Merge over the empty shape so a file written by an older version
      // never leaves a newly added section undefined, then repair individual
      // milestones, which the top-level merge cannot reach.
      const merged = { ...EMPTY_ABOUT, ...stored };
      return {
        ...merged,
        milestones: (merged.milestones ?? []).map(normaliseMilestone),
      };
    } catch (err) {
      this.logger.error(`Could not read about content: ${String(err)}`);
      return { ...EMPTY_ABOUT };
    }
  }

  save(content: AboutContent): AboutContent {
    try {
      if (!existsSync(this.dataDir))
        mkdirSync(this.dataDir, { recursive: true });

      // Temp file then rename, so a crash mid-write cannot truncate it.
      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, JSON.stringify(content, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save about content: ${String(err)}`);
    }

    return content;
  }
}
