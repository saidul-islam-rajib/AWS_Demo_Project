import { Injectable, Logger } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { dataDir } from '../persistence/json-collection';
import {
  CONFIG_DEFAULTS,
  ConfigValues,
  normaliseConfig,
} from './config.schema';
import { getConfig, setConfig } from './config.store';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  private get file(): string {
    return join(dataDir(), 'platform-config.json');
  }

  constructor() {
    setConfig(this.read());
  }

  private read(): ConfigValues {
    try {
      if (!existsSync(this.file)) return { ...CONFIG_DEFAULTS };

      const stored = JSON.parse(
        readFileSync(this.file, 'utf8'),
      ) as Partial<ConfigValues>;

      return normaliseConfig(stored);
    } catch (err) {
      this.logger.error(
        `Could not load config, using defaults: ${String(err)}`,
      );

      return { ...CONFIG_DEFAULTS };
    }
  }

  get(): ConfigValues {
    return getConfig();
  }

  update(input: Partial<ConfigValues>): ConfigValues {
    const next = normaliseConfig({ ...getConfig(), ...input });

    this.persist(next);
    setConfig(next);

    return next;
  }

  private persist(value: ConfigValues): void {
    try {
      const dir = dataDir();
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save config: ${String(err)}`);
    }
  }
}
