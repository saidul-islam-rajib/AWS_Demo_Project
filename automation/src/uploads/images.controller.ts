import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ALLOWED_WIDTHS, ImagesService } from './images.service';

/**
 * Public image endpoint. Serves a width-appropriate copy so a gallery thumb
 * does not download a multi-megabyte original.
 *
 * Deliberately not behind the auth guard: these are the same files
 * /uploads already serves publicly, just smaller.
 */
@Controller('img')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

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

    // Filenames carry a timestamp and random suffix, so a given URL always
    // refers to the same bytes and can be cached hard.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(path);
  }
}
