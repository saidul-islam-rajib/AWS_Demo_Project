import { DEFAULT_SETTINGS, SiteSettings } from './settings.model';

let current: SiteSettings = { ...DEFAULT_SETTINGS };

export function getSettings(): SiteSettings {
  return current;
}

export function setSettings(next: SiteSettings): void {
  current = next;
}
