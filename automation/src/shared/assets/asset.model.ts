export type AssetKind = 'css' | 'js';

export const ASSET_MIME: Record<AssetKind, string> = {
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
};

export const ASSET_BASE_PATH = '/assets';

export interface Asset {
  name: string;
  kind: AssetKind;
  content: string;
  fingerprint: string;
}

export function assetPath(
  asset: Pick<Asset, 'kind' | 'name' | 'fingerprint'>,
): string {
  return `${ASSET_BASE_PATH}/${asset.kind}/${asset.name}.${asset.fingerprint}.${asset.kind}`;
}
