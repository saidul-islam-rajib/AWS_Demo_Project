import sharp from 'sharp';
import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
  certificateSvg,
  fitText,
} from './certificate.svg';

const fields = {
  holder: 'Saidul Islam Rajib',
  contact: 'a@b.com',
  course: 'Computer Networking',
  detail: '3 lessons · 3 min of reading',
  issued: '23 July 2026',
  author: 'Saidul Islam Rajib',
  reference: 'AB12CD3',
};

describe('fitText', () => {
  it('leaves short text alone', () => {
    expect(fitText('Rajib', 20)).toBe('Rajib');
  });

  it('truncates with an ellipsis rather than overflowing the card', () => {
    const result = fitText('x'.repeat(60), 20);

    expect(result).toHaveLength(20);
    expect(result.endsWith('…')).toBe(true);
  });
});

describe('certificateSvg', () => {
  it('includes every field it was given', () => {
    const svg = certificateSvg(fields);

    expect(svg).toContain('Saidul Islam Rajib');
    expect(svg).toContain('Computer Networking');
    expect(svg).toContain('a@b.com');
    expect(svg).toContain('23 July 2026');
    expect(svg).toContain('AB12CD3');
  });

  it('omits the contact line when there is no address', () => {
    expect(certificateSvg({ ...fields, contact: '' })).not.toContain('a@b.com');
  });

  it('escapes a holder name rather than injecting markup', () => {
    const svg = certificateSvg({ ...fields, holder: '<script>x</script>' });

    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('escapes an ampersand, which would otherwise break the XML', () => {
    expect(certificateSvg({ ...fields, course: 'Ops & Tools' })).toContain(
      'Ops &amp; Tools',
    );
  });

  it('names fonts that exist in the container', () => {
    expect(certificateSvg(fields)).toContain('DejaVu Sans');
  });

  it('renders to a png of the declared size', async () => {
    const png = await sharp(Buffer.from(certificateSvg(fields)))
      .png()
      .toBuffer();

    const meta = await sharp(png).metadata();

    expect(meta.format).toBe('png');
    expect(meta.width).toBe(CERTIFICATE_WIDTH);
    expect(meta.height).toBe(CERTIFICATE_HEIGHT);
  });

  it('survives a name long enough to overflow', async () => {
    const png = await sharp(
      Buffer.from(certificateSvg({ ...fields, holder: 'x'.repeat(300) })),
    )
      .png()
      .toBuffer();

    expect(png.length).toBeGreaterThan(0);
  });
});
