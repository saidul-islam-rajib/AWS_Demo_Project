import { Global, Module } from '@nestjs/common';
import { AssetRegistryService } from './asset-registry.service';
import { AssetsController } from './assets.controller';
import { AssetsBootstrap } from './assets.bootstrap';

@Global()
@Module({
  controllers: [AssetsController],
  providers: [AssetRegistryService, AssetsBootstrap],
  exports: [AssetRegistryService],
})
export class AssetsModule {}
