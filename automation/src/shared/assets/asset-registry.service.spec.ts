import { AssetRegistryService } from './asset-registry.service';

describe('AssetRegistryService', () => {
  let registry: AssetRegistryService;

  beforeEach(() => {
    registry = new AssetRegistryService();
    registry.register('css', 'demo', ['.a { color: red; }']);
  });

  it('builds a fingerprinted href', () => {
    expect(registry.href('css', 'demo')).toMatch(
      /^\/assets\/css\/demo\.[0-9a-f]{12}\.css$/,
    );
  });

  it('resolves a registered asset by its fingerprinted name', () => {
    const href = registry.href('css', 'demo');
    const file = href.replace('/assets/css/', '').replace('.css', '');

    expect(registry.resolve('css', file)?.content).toContain('color: red');
  });

  it('rejects a name whose fingerprint does not match', () => {
    expect(registry.resolve('css', 'demo.000000000000')).toBeUndefined();
  });

  it('changes the fingerprint when the content changes', () => {
    const before = registry.href('css', 'demo');
    registry.register('css', 'demo', ['.a { color: blue; }']);

    expect(registry.href('css', 'demo')).not.toBe(before);
  });

  it('returns an empty href for an unknown bundle', () => {
    expect(registry.href('js', 'missing')).toBe('');
  });
});
