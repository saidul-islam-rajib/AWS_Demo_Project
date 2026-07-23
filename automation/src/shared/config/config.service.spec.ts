import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigService } from './config.service';
import { getConfig } from './config.store';
import { CONFIG_DEFAULTS } from './config.schema';

describe('ConfigService', () => {
  let dir: string;
  let service: ConfigService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'config-test-'));
    process.env.DATA_DIR = dir;
    service = new ConfigService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('starts from the defaults', () => {
    expect(service.get()).toEqual(CONFIG_DEFAULTS);
  });

  it('clamps a saved value into range', () => {
    service.update({ 'security.maxLoginAttempts': 999 });

    expect(service.get()['security.maxLoginAttempts']).toBe(50);
  });

  it('updates the store the policies read from', () => {
    service.update({ 'recovery.resetLinkMinutes': 30 });

    expect(getConfig()['recovery.resetLinkMinutes']).toBe(30);
  });

  it('keeps values that were not submitted', () => {
    service.update({ 'security.sessionDays': 7 });

    expect(service.get()['recovery.codeGroups']).toBe(
      CONFIG_DEFAULTS['recovery.codeGroups'],
    );
  });

  it('survives a restart', () => {
    service.update({ 'content.adminPageSize': 25 });

    expect(new ConfigService().get()['content.adminPageSize']).toBe(25);
  });
});
