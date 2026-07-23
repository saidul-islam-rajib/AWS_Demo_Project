import { Injectable, OnModuleInit } from '@nestjs/common';
import { AssetRegistryService } from './asset-registry.service';
import { useAssetRegistry } from './asset.store';
import { UI_COMPONENTS_CSS, UI_COPY_JS } from '../view/ui.assets';

export const UI_BUNDLE = 'ui';

@Injectable()
export class AssetsBootstrap implements OnModuleInit {
  constructor(private readonly registry: AssetRegistryService) {}

  onModuleInit(): void {
    this.registry.register('css', UI_BUNDLE, [UI_COMPONENTS_CSS]);
    this.registry.register('js', UI_BUNDLE, [UI_COPY_JS]);

    useAssetRegistry(this.registry);
  }
}
