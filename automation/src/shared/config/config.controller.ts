import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { ConfigService } from './config.service';
import { ConfigValues } from './config.schema';

@Controller('admin/settings/config')
@UseGuards(AuthGuard)
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  @Post()
  save(@Body() body: Partial<ConfigValues>, @Res() res: Response): void {
    this.config.update(body);
    res.redirect('/admin/settings?saved=1#config');
  }
}
