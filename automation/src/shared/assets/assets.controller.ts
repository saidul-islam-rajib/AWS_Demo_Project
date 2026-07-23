import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AssetRegistryService } from './asset-registry.service';
import { ASSET_MIME, AssetKind } from './asset.model';

const IMMUTABLE = 'public, max-age=31536000, immutable';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetRegistryService) {}

  private serve(kind: AssetKind, file: string, res: Response): void {
    const asset = this.assets.resolve(kind, file.replace(/\.[a-z]+$/, ''));

    if (!asset) {
      res.status(404).send('Not found');
      return;
    }

    res.setHeader('Content-Type', ASSET_MIME[kind]);
    res.setHeader('Cache-Control', IMMUTABLE);
    res.send(asset.content);
  }

  @Get('css/:file')
  css(@Param('file') file: string, @Res() res: Response): void {
    this.serve('css', file, res);
  }

  @Get('js/:file')
  js(@Param('file') file: string, @Res() res: Response): void {
    this.serve('js', file, res);
  }
}
