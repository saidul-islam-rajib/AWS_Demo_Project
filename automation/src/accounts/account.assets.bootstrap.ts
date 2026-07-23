import { Injectable, OnModuleInit } from '@nestjs/common';
import { AssetRegistryService } from '../shared/assets/asset-registry.service';
import {
  ACCOUNT_ADMIN_BUNDLE,
  ACCOUNT_ADMIN_CSS,
  ACCOUNT_BUNDLE,
  ACCOUNT_PUBLIC_CSS,
} from './account.assets';

@Injectable()
export class AccountAssetsBootstrap implements OnModuleInit {
  constructor(private readonly registry: AssetRegistryService) {}

  onModuleInit(): void {
    this.registry.register('css', ACCOUNT_BUNDLE, [ACCOUNT_PUBLIC_CSS]);
    this.registry.register('css', ACCOUNT_ADMIN_BUNDLE, [ACCOUNT_ADMIN_CSS]);
  }
}
