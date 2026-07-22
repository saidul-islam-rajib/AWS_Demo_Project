import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ALLOWED_WIDTHS, ImagesService } from './images.service';

@Controller('img')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Get('og/:name')
  async card(@Param('name') name: string, @Res() res: Response): Promise<void> {
    const path = await this.images.socialCard(name);

    if (!path) {
      res.status(404).send('Not found');
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(path);
  }

  @Get(':name')
  async serve(
    @Param('name') name: string,
    @Query('w') widthParam: string,
    @Res() res: Response,
  ): Promise<void> {
    const parsed = Number.parseInt(widthParam ?? '', 10);
    const width = ALLOWED_WIDTHS.includes(parsed) ? parsed : 0;

    const path = width
      ? await this.images.variant(name, width)
      : this.images.originalPath(name);

    if (!path) {
      res.status(404).send('Not found');
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(path);
  }
}
