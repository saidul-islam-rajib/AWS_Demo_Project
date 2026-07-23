import { CONFIG_DEFAULTS, ConfigValues } from './config.schema';

let current: ConfigValues = { ...CONFIG_DEFAULTS };

export function getConfig(): ConfigValues {
  return current;
}

export function setConfig(next: ConfigValues): void {
  current = next;
}

export function configNumber(key: string): number {
  const value = current[key];

  return typeof value === 'number' ? value : Number(CONFIG_DEFAULTS[key]);
}

export function configText(key: string): string {
  const value = current[key];

  return typeof value === 'string' ? value : String(CONFIG_DEFAULTS[key]);
}
