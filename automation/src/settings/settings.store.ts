import { DEFAULT_SETTINGS, SiteSettings } from './settings.model';

/**
 * Module-level snapshot of the current settings.
 *
 * The view functions are plain template builders rather than injectable
 * providers, so they read from here instead of taking settings as a parameter
 * on every call. SettingsService owns writes and keeps this in step.
 */
let current: SiteSettings = { ...DEFAULT_SETTINGS };

export function getSettings(): SiteSettings {
  return current;
}

export function setSettings(next: SiteSettings): void {
  current = next;
}
