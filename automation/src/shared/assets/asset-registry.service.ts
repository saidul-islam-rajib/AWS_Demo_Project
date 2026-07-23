import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Asset, AssetKind, assetPath } from './asset.model';

interface Registration {
  name: string;
  kind: AssetKind;
  parts: string[];
}

@Injectable()
export class AssetRegistryService {
  private readonly registrations = new Map<string, Registration>();
  private readonly built = new Map<string, Asset>();

  private key(kind: AssetKind, name: string): string {
    return `${kind}:${name}`;
  }

  register(kind: AssetKind, name: string, parts: string[]): void {
    this.registrations.set(this.key(kind, name), { name, kind, parts });
    this.built.delete(this.key(kind, name));
  }

  private build(kind: AssetKind, name: string): Asset | undefined {
    const cached = this.built.get(this.key(kind, name));
    if (cached) return cached;

    const registration = this.registrations.get(this.key(kind, name));
    if (!registration) return undefined;

    const content = registration.parts
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n');

    const fingerprint = createHash('sha256')
      .update(content)
      .digest('hex')
      .slice(0, 12);

    const asset: Asset = { name, kind, content, fingerprint };
    this.built.set(this.key(kind, name), asset);

    return asset;
  }

  href(kind: AssetKind, name: string): string {
    const asset = this.build(kind, name);

    return asset ? assetPath(asset) : '';
  }

  resolve(kind: AssetKind, file: string): Asset | undefined {
    const match = /^(.+)\.([0-9a-f]{12})$/.exec(file);
    if (!match) return undefined;

    const asset = this.build(kind, match[1]);

    return asset && asset.fingerprint === match[2] ? asset : undefined;
  }
}
