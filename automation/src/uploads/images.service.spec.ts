import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { ALLOWED_WIDTHS, ImagesService } from './images.service';
import { uploadDir } from './uploads.service';

describe('ImagesService', () => {
  let dir: string;
  let service: ImagesService;

  /** A real encoded image, so sharp has something genuine to work on. */
  const writeImage = async (name: string, width: number, height: number) => {
    const buffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 120, g: 80, b: 200 },
      },
    })
      .png()
      .toBuffer();

    writeFileSync(join(uploadDir(), name), buffer);
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'images-test-'));
    process.env.DATA_DIR = dir;
    service = new ImagesService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Windows can hold a lock briefly after sharp closes; a leftover temp
      // directory must not fail an otherwise passing test.
    }
  });

  it('resizes to a much smaller file than the original', async () => {
    await writeImage('big.png', 1600, 1200);

    const original = join(uploadDir(), 'big.png');
    const variant = await service.variant('big.png', 400);

    expect(variant).not.toBe(original);
    expect(statSync(variant as string).size).toBeLessThan(
      statSync(original).size,
    );
  });

  it('produces the requested width', async () => {
    await writeImage('big.png', 1600, 1200);

    const variant = await service.variant('big.png', 400);
    // Read into a buffer first: reading by path leaves the file open, which
    // then blocks the temp directory cleanup on Windows.
    const meta = await sharp(readFileSync(variant as string)).metadata();

    expect(meta.width).toBe(400);
  });

  it('caches, so a second request does not rewrite the file', async () => {
    await writeImage('big.png', 1600, 1200);

    const first = (await service.variant('big.png', 400)) as string;
    const stamp = statSync(first).mtimeMs;

    const second = (await service.variant('big.png', 400)) as string;

    expect(second).toBe(first);
    expect(statSync(second).mtimeMs).toBe(stamp);
  });

  it('applies EXIF orientation instead of serving the raw sensor image', async () => {
    // Red on top, blue underneath, tagged as needing a 180 degree rotation —
    // exactly what a phone writes when the photo was taken upside down.
    const top = await sharp({
      create: {
        width: 400,
        height: 200,
        channels: 3,
        background: { r: 200, g: 30, b: 30 },
      },
    })
      .png()
      .toBuffer();
    const bottom = await sharp({
      create: {
        width: 400,
        height: 200,
        channels: 3,
        background: { r: 30, g: 30, b: 200 },
      },
    })
      .png()
      .toBuffer();
    const joined = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite([
        { input: top, top: 0, left: 0 },
        { input: bottom, top: 200, left: 0 },
      ])
      .jpeg()
      .toBuffer();

    writeFileSync(
      join(uploadDir(), 'rotated.jpg'),
      await sharp(joined).withMetadata({ orientation: 3 }).toBuffer(),
    );

    const variant = await service.variant('rotated.jpg', 200);
    const pixels = await sharp(readFileSync(variant as string))
      .raw()
      .toBuffer();

    // Rotating 180 degrees brings the blue half to the top. Without
    // auto-orientation the resize drops the tag and this stays red.
    expect(pixels[2]).toBeGreaterThan(pixels[0]);
  });

  it('never upscales a small original', async () => {
    await writeImage('small.png', 120, 90);

    const variant = await service.variant('small.png', 800);

    // Returns the original rather than a blown-up copy.
    expect(variant).toBe(join(uploadDir(), 'small.png'));
  });

  it('passes through a width that is not offered', async () => {
    await writeImage('big.png', 1600, 1200);

    expect(await service.variant('big.png', 333)).toBe(
      join(uploadDir(), 'big.png'),
    );
  });

  it('does not try to resize svg or gif', () => {
    writeFileSync(join(uploadDir(), 'logo.svg'), '<svg></svg>');

    expect(service.canResize('logo.svg')).toBe(false);
    expect(service.canResize('anim.gif')).toBe(false);
    expect(service.canResize('photo.jpg')).toBe(true);
  });

  it('refuses a path outside the upload directory', async () => {
    expect(service.originalPath('../posts.json')).toBeNull();
    expect(service.originalPath('sub/dir.png')).toBeNull();
    expect(await service.variant('../../etc/passwd', 400)).toBeNull();
  });

  it('returns null for a file that does not exist', async () => {
    expect(await service.variant('missing.png', 400)).toBeNull();
  });

  it('keeps the cache outside the upload directory', async () => {
    await writeImage('big.png', 1600, 1200);
    await service.variant('big.png', 400);

    // Otherwise the cache would be listed as a user upload and served
    // by the static handler.
    expect(existsSync(join(dir, 'cache', 'images'))).toBe(true);
    expect(existsSync(join(uploadDir(), 'cache'))).toBe(false);
  });

  it('offers the widths the views actually request', () => {
    expect(ALLOWED_WIDTHS).toEqual(expect.arrayContaining([400, 800, 1600]));
  });
});
