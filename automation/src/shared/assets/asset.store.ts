import { AssetKind } from './asset.model';
import { AssetRegistryService } from './asset-registry.service';

export interface AssetRef {
  kind: AssetKind;
  name: string;
}

let registry: AssetRegistryService | undefined;

export function useAssetRegistry(next: AssetRegistryService): void {
  registry = next;
}

export function assetHref(ref: AssetRef): string {
  return registry ? registry.href(ref.kind, ref.name) : '';
}

export const css = (name: string): AssetRef => ({ kind: 'css', name });

export const js = (name: string): AssetRef => ({ kind: 'js', name });
