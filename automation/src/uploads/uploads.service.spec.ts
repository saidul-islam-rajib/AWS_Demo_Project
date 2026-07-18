import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  let dir: string;
  let service: UploadsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'uploads-test-'));
    process.env.DATA_DIR = dir;
    service = new UploadsService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates the upload directory', () => {
    expect(existsSync(service.dir)).toBe(true);
  });

  it('accepts image extensions and rejects everything else', () => {
    expect(service.isAllowed('photo.png')).toBe(true);
    expect(service.isAllowed('PHOTO.JPG')).toBe(true);
    expect(service.isAllowed('anim.gif')).toBe(true);
    expect(service.isAllowed('shell.sh')).toBe(false);
    expect(service.isAllowed('payload.js')).toBe(false);
    expect(service.isAllowed('noextension')).toBe(false);
  });

  it('generates a random name keeping only the extension', () => {
    const name = service.generateName('My Holiday Photo.PNG');

    expect(name).toMatch(/^\d+-[0-9a-f]{12}\.png$/);
    expect(name).not.toContain('Holiday');
  });

  it('discards a traversal attempt in the original name', () => {
    const name = service.generateName('../../etc/passwd.png');

    expect(name).not.toContain('..');
    expect(name).not.toContain('/');
  });

  it('lists uploads newest first', () => {
    writeFileSync(join(service.dir, 'a.png'), 'x');
    writeFileSync(join(service.dir, 'b.png'), 'yy');

    const list = service.list();

    expect(list).toHaveLength(2);
    expect(list.map((f) => f.url)).toContain('/uploads/a.png');
  });

  it('ignores non-image files when listing', () => {
    writeFileSync(join(service.dir, 'notes.txt'), 'x');

    expect(service.list()).toHaveLength(0);
  });

  it('removes an upload', () => {
    writeFileSync(join(service.dir, 'gone.png'), 'x');

    expect(service.remove('gone.png')).toBe(true);
    expect(existsSync(join(service.dir, 'gone.png'))).toBe(false);
  });

  it('refuses to remove paths outside the upload directory', () => {
    expect(service.remove('../posts.json')).toBe(false);
    expect(service.remove('sub/dir.png')).toBe(false);
    expect(service.remove('..\\posts.json')).toBe(false);
  });

  it('returns false when removing something that does not exist', () => {
    expect(service.remove('missing.png')).toBe(false);
  });
});
